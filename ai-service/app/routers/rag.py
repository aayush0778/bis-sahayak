"""FastAPI routes for the RAG surface. Internal service — Node proxies here."""
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import applicability, llm, retrieval
from ..chunking import chunk_standard
from ..db import query_rows
from ..embeddings import current_model_name, embed
from ..prompts import REFUSAL_TEXT

router = APIRouter(prefix="/rag", tags=["rag"])
internal_router = APIRouter(tags=["internal"])


class HistoryItem(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class RagQuery(BaseModel):
    query: str = Field(min_length=2, max_length=2000)
    history: list[HistoryItem] = []


class ApplicabilityQuery(BaseModel):
    productDescription: str = Field(min_length=3, max_length=2000)
    category: str | None = None


class ComplaintQuery(BaseModel):
    productDescription: str = Field(min_length=3, max_length=2000)
    defectDescription: str = Field(min_length=3, max_length=4000)
    relatedRecordNumber: str | None = None


class EmbedQuery(BaseModel):
    text: str = Field(min_length=1, max_length=8000)


def _citations(results: list[dict]) -> list[dict]:
    out = []
    seen: set[tuple] = set()
    for r in results:
        key = (r["type"], r["ref"])
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "type": r["type"],
                "ref": r["ref"],
                "source_url": r.get("source_url"),
            }
        )
    return out


@router.post("/answer")
def rag_answer(body: RagQuery) -> dict:
    try:
        results = retrieval.retrieve(body.query)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"retrieval unavailable: {exc}") from exc

    if not retrieval.grounded(results, body.query):
        return {"answer": REFUSAL_TEXT, "citations": [], "grounded": False}

    # Keep synthesis (and citations) to chunks that are actually on-topic;
    # the gate above guarantees the top chunk is relevant.
    synth_blocks = [r for r in results if r["similarity"] >= retrieval.SYNTH_FLOOR] or results[:2]

    answer = llm.synthesize_answer(body.query, synth_blocks)
    return {"answer": answer, "citations": _citations(synth_blocks), "grounded": True}


@router.post("/applicability")
def rag_applicability(body: ApplicabilityQuery) -> dict:
    try:
        standards = query_rows(
            'SELECT is_number, title, "group", sub_group, sub_sub_group, certification_scheme, '
            "aliases, source_url FROM standards"
        )
        qcos = query_rows(
            "SELECT title, product_categories, applicable_is_numbers, effective_date, "
            "issuing_authority, scheme, summary, source_url FROM qco_notifications"
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"database unavailable: {exc}") from exc

    result = applicability.evaluate_applicability(body.productDescription, body.category, standards, qcos)

    why = None
    if result["standards"]:
        if result["mandatory"]:
            qco = result["qcoRefs"][0]
            why = (
                f"Your product matches {result['standards'][0]['is_number']} "
                f"({result['standards'][0]['title']}), which is covered by the QCO "
                f"\"{qco['ref']}\" — so BIS certification is mandatory (effective "
                f"{qco['effective_date']})."
            )
        else:
            why = (
                f"Your product matches {result['standards'][0]['is_number']} "
                f"({result['standards'][0]['title']}). No QCO in BIS Sahayak's seeded corpus covers "
                f"this standard right now, so certification appears voluntary — confirm at "
                f"bis.gov.in before relying on this."
            )
    return {**result, "why": why}


_RECORD_RE = re.compile(
    r"(CM/L[- ]?\d{6,12}|HUID[- ]?[A-Z0-9]{6}|[A-Z]{2}\d{4}\b|R[- ]\d{6,10})", re.IGNORECASE
)


@router.post("/complaint-draft")
def rag_complaint_draft(body: ComplaintQuery) -> dict:
    try:
        standards = query_rows(
            'SELECT is_number, title, "group", sub_group, sub_sub_group, certification_scheme, '
            "aliases, source_url FROM standards"
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"database unavailable: {exc}") from exc

    matches = applicability.match_standards(body.productDescription, standards, limit=1)
    category = matches[0]["sub_group"] if matches and matches[0].get("sub_group") else None
    related = body.relatedRecordNumber or (
        _RECORD_RE.search(body.productDescription).group(0)
        if _RECORD_RE.search(body.productDescription)
        else None
    )

    draft_text = llm.synthesize_complaint(
        body.productDescription, body.defectDescription, related, category
    )
    return {
        "draft": {
            "category": category,
            "relatedRecordNumber": related,
            "body": draft_text,
        },
        "citations": [
            {"type": "standard", "ref": m["is_number"], "source_url": m.get("source_url")}
            for m in matches
        ],
    }


@internal_router.post("/embed")
def embed_text(body: EmbedQuery) -> dict:
    return {"model": current_model_name(), "embedding": embed(body.text)}


__all__ = ["router", "internal_router", "chunk_standard"]
