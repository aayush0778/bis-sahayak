"""pgvector similarity search over the embeddings table."""
import os

from .db import query_rows
from .embeddings import current_model_name, embed, stem, tokenize

RETRIEVAL_K = int(os.environ.get("RETRIEVAL_K", "6"))
# Below this top similarity the assistant refuses to answer instead of improvising
# (spec Section 13 — the single most demo-critical behaviour).
# Calibrated against the seeded corpus: real product queries score >= 0.35,
# off-corpus queries <= 0.25 (see tests + ingestion sanity check).
GROUNDING_THRESHOLD = float(os.environ.get("GROUNDING_THRESHOLD", "0.30"))
# Lexical-coverage floor for the grounding gate (see grounded()).
MIN_CONTENT_OVERLAP = float(os.environ.get("MIN_CONTENT_OVERLAP", "0.25"))
# Chunks below this similarity are excluded from answer synthesis (they may still
# inform retrieval ranking); keeps the extractive synthesizer on-topic.
SYNTH_FLOOR = float(os.environ.get("SYNTH_FLOOR", "0.28"))

SQL = """
SELECT e.source_type, e.source_id, e.chunk_text,
       1 - (e.embedding <=> %s::vector) AS similarity,
       COALESCE(s.title, q.title) AS title,
       COALESCE(s.source_url, q.source_url) AS source_url
FROM embeddings e
LEFT JOIN standards s
       ON e.source_type = 'standard' AND s.is_number = e.source_id
LEFT JOIN qco_notifications q
       ON e.source_type = 'qco' AND q.id::text = e.source_id
WHERE e.model = %s
ORDER BY e.embedding <=> %s::vector
LIMIT %s
"""


def retrieve(query: str, k: int | None = None) -> list[dict]:
    """Return top-k chunks with {ref, type, source_url, chunk_text, similarity, title}."""
    vector_literal = "[" + ",".join(f"{x:.6f}" for x in embed(query)) + "]"
    rows = query_rows(SQL, (vector_literal, current_model_name(), vector_literal, k or RETRIEVAL_K))
    results = []
    for row in rows:
        results.append(
            {
                "type": row["source_type"],
                "ref": row["source_id"] if row["source_type"] == "standard" else row["title"],
                "source_id": row["source_id"],
                "title": row["title"],
                "source_url": row["source_url"],
                "chunk_text": row["chunk_text"],
                "similarity": float(row["similarity"]),
            }
        )
    return results


def grounded(results: list[dict], query: str | None = None) -> bool:
    """Two-factor grounding gate.

    1. Absolute floor on top-1 cosine — long queries accumulate hash collisions,
       so similarity alone cannot separate real matches from noise.
    2. Lexical coverage: a meaningful fraction of the query's content words must
       literally appear in the top chunk. Off-corpus queries score ~0 here even
       when their collision-inflated similarity clears the floor.
    """
    if not results or results[0]["similarity"] < GROUNDING_THRESHOLD:
        return False
    if query:
        return content_overlap(query, results[0]["chunk_text"]) >= MIN_CONTENT_OVERLAP
    return True


def content_overlap(query: str, chunk_text: str) -> float:
    """Fraction of the query's content tokens (stemmed) present in the chunk text."""
    tokens = {stem(t) for t in tokenize(query)}
    if not tokens:
        return 0.0
    chunk_tokens = {stem(t) for t in tokenize(chunk_text)}
    return len(tokens & chunk_tokens) / len(tokens)
