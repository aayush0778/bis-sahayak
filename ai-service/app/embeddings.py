"""Embedding layer.

One function, `embed(text) -> list[float]`, three swappable backends:

* `hash`   — default. Deterministic token + character-trigram hashing, pure
             stdlib, zero network. Good keyword-level retrieval on a curated
             corpus; makes the demo work with no model download at all.
* `minilm` — sentence-transformers `all-MiniLM-L6-v2` (384-dim) if the extra
             dependency is installed locally.
* `api`    — any OpenAI-compatible `/embeddings` endpoint configured via env.

All backends return L2-normalised vectors of EMBEDDING_DIM (384) so the
pgvector column and ivfflat index stay valid when the backend is swapped
(embeddings must simply be re-generated, keyed by model name in the DB).
"""
import hashlib
import math
import os
import re

EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIM", "384"))
BACKEND = os.environ.get("EMBEDDING_BACKEND", "hash").lower()

API_BASE = os.environ.get("EMBEDDING_API_BASE", "")
API_KEY = os.environ.get("EMBEDDING_API_KEY", "")
API_MODEL = os.environ.get("EMBEDDING_API_MODEL", "text-embedding-3-small")

MINILM_MODEL = "all-MiniLM-L6-v2"

_WORD_RE = re.compile(r"[a-z0-9]+")

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "for", "in", "on", "to", "is", "are",
    "be", "been", "with", "as", "at", "by", "it", "its", "this", "that", "i",
    "we", "you", "my", "our", "do", "does", "need", "needs", "want", "make",
    "made", "have", "has", "can", "should", "would", "will", "me", "us", "get",
    "got", "what", "which", "how", "why", "where", "when", "from", "into",
    "under", "about", "per", "also", "any", "some", "there", "here", "am",
    # domain words present in virtually every chunk — zero discriminative value
    "bis", "standard", "standards", "india", "indian", "specification",
    "certification", "mandatory", "requirements", "particular", "applies",
}


def stem(token: str) -> str:
    """Crude plural stem — consistent on both query and corpus side, so safe."""
    if token.endswith("s") and not token.endswith("ss") and len(token) > 3:
        return token[:-1]
    return token

_minilm = None


def current_model_name() -> str:
    if BACKEND == "minilm":
        return "minilm-all-MiniLM-L6-v2"
    if BACKEND == "api":
        return f"api-{API_MODEL}"
    return "hash-v3"


def tokenize(text: str) -> list[str]:
    return [t for t in _WORD_RE.findall(text.lower()) if len(t) > 1 and t not in STOPWORDS]


def _position(token: str, n: int = EMBEDDING_DIM) -> int:
    digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
    return int.from_bytes(digest, "big") % n


def _hash_embedding(text: str) -> list[float]:
    """Sparse hashing trick: one position per token plus a prefix-stem position.

    Density matters: with several hashed positions per token (and trigrams) a
    384-dim vector saturates and every pair of texts correlates ~0.4, which
    destroys the grounding gate. One position per token keeps unrelated texts
    near zero while shared tokens (and shared 5-char prefixes, giving light
    stemming like cooker/cookers) dominate.
    """
    vec = [0.0] * EMBEDDING_DIM
    for word in tokenize(text):
        token = stem(word)
        vec[_position(token)] += 1.0
        if len(token) > 5:
            vec[_position(token[:5])] += 0.5
    norm = math.sqrt(sum(x * x for x in vec))
    if norm == 0:
        return vec
    return [x / norm for x in vec]


def _minilm_embedding(text: str) -> list[float]:
    global _minilm
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "EMBEDDING_BACKEND=minilm requires `pip install sentence-transformers`"
        ) from exc
    if _minilm is None:
        _minilm = SentenceTransformer(MINILM_MODEL)
    vector = _minilm.encode([text], normalize_embeddings=True)[0]
    return [float(x) for x in vector]


def _api_embedding(text: str) -> list[float]:
    import httpx

    if not API_BASE:
        raise RuntimeError("EMBEDDING_BACKEND=api requires EMBEDDING_API_BASE")
    response = httpx.post(
        f"{API_BASE.rstrip('/')}/embeddings",
        headers={"Authorization": f"Bearer {API_KEY}"} if API_KEY else {},
        json={"model": API_MODEL, "input": text},
        timeout=30.0,
    )
    response.raise_for_status()
    vector = response.json()["data"][0]["embedding"]
    if len(vector) != EMBEDDING_DIM:
        raise RuntimeError(
            f"API embedding dim {len(vector)} != configured EMBEDDING_DIM {EMBEDDING_DIM}"
        )
    return [float(x) for x in vector]


def embed(text: str) -> list[float]:
    text = (text or "").strip()
    if not text:
        return [0.0] * EMBEDDING_DIM
    if BACKEND == "minilm":
        vector = _minilm_embedding(text)
    elif BACKEND == "api":
        vector = _api_embedding(text)
    else:
        vector = _hash_embedding(text)
    if len(vector) != EMBEDDING_DIM:  # pragma: no cover
        raise RuntimeError(f"embedding dim {len(vector)} != {EMBEDDING_DIM}")
    return vector


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)
