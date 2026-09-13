"""v3 schema migration: expose the grounding gate in stored chat history.

Idempotent — safe to run against local Postgres and Neon production.
Usage: python ingestion/migrate_v3.py
"""
from common import connect, database_url


def main() -> None:
    statements = [
        # best cosine similarity of the retrieval that fed this answer (NULL for
        # legacy rows and refusals before the score was tracked)
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS grounding_score REAL",
    ]
    with connect() as conn, conn.cursor() as cur:
        for sql in statements:
            cur.execute(sql)
    print(f"[migrate_v3] applied against {database_url().split('@')[-1]}")


if __name__ == "__main__":
    main()
