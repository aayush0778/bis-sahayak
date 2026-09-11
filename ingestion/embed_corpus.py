"""Chunk + embed the seeded corpus into the `embeddings` table (pgvector).

Chunks are built from the *public* metadata of each record (title,
classification, scope/summary, aliases, categories, dates) — never full
standard text, which BIS does not publish for free (spec Section 9.3).

The embedding function itself lives in ai-service/app/embeddings.py so the
retrieval path and the ingestion path can never drift apart.

Usage: python ingestion/embed_corpus.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ai-service"))

from app.chunking import chunk_qco, chunk_standard  # noqa: E402
from app.embeddings import current_model_name, embed  # noqa: E402

from common import connect  # noqa: E402

INSERT = """
INSERT INTO embeddings (source_type, source_id, chunk_index, chunk_text, model, embedding)
VALUES (%s, %s, %s, %s, %s, %s::vector)
"""


def embed_rows(cur, source_type: str, source_id: str, chunks: list[str]) -> None:
    cur.execute(
        "DELETE FROM embeddings WHERE model = %s AND source_type = %s AND source_id = %s",
        (current_model_name(), source_type, source_id),
    )
    for idx, text in enumerate(chunks):
        vector = embed(text)
        literal = "[" + ",".join(f"{x:.6f}" for x in vector) + "]"
        cur.execute(INSERT, (source_type, source_id, idx, text, current_model_name(), literal))


def main() -> None:
    model = current_model_name()
    print(f"[embed_corpus] embedding backend: {model}")
    with connect() as conn, conn.cursor() as cur:
        # ivfflat built on an empty table misses rows; exact scan is fine at demo scale.
        cur.execute("DROP INDEX IF EXISTS embeddings_ivfflat")
        cur.execute(
            "SELECT is_number, title, \"group\", sub_group, certification_scheme, "
            "superseding_is, superseded_is, cross_referenced_is, aliases FROM standards"
        )
        standards = cur.fetchall()
        cols = [d.name for d in cur.description] if cur.description else [
            "is_number", "title", "group", "sub_group", "certification_scheme",
            "superseding_is", "superseded_is", "cross_referenced_is", "aliases",
        ]
        for row in standards:
            rec = dict(zip(cols, row))
            embed_rows(cur, "standard", rec["is_number"], chunk_standard(rec))

        cur.execute(
            "SELECT id::text, title, product_categories, applicable_is_numbers, "
            "effective_date, issuing_authority, scheme, summary FROM qco_notifications"
        )
        qcols = [d.name for d in cur.description] if cur.description else [
            "id", "title", "product_categories", "applicable_is_numbers",
            "effective_date", "issuing_authority", "scheme", "summary",
        ]
        qco_count = 0
        for row in cur.fetchall():
            rec = dict(zip(qcols, row))
            rec["effective_date"] = rec["effective_date"].isoformat() if rec["effective_date"] else None
            embed_rows(cur, "qco", rec["id"], chunk_qco(rec))
            qco_count += 1

        cur.execute("SELECT count(*) FROM embeddings WHERE model = %s", (model,))
        total = cur.fetchone()[0]
        conn.commit()

    print(
        f"[embed_corpus] embedded {len(standards)} standards and {qco_count} QCOs; "
        f"{total} chunks stored in the embeddings table (model={model})"
    )


if __name__ == "__main__":
    main()
