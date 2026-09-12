"""v2 schema migration for databases initialised before the upgrade.

Idempotent — safe to run against local Postgres and Neon production.
Usage: python ingestion/migrate_v2.py
"""
from common import connect, database_url


def main() -> None:
    statements = [
        "ALTER TABLE complaints ADD COLUMN IF NOT EXISTS cpgrams_url TEXT",
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS synthesis TEXT",
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS fell_back BOOLEAN DEFAULT FALSE",
        """
        CREATE TABLE IF NOT EXISTS bis_offices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          office_type TEXT NOT NULL CHECK (office_type IN ('hq', 'regional_office', 'branch_office', 'laboratory')),
          name TEXT NOT NULL,
          region TEXT,
          address TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          geocode_precision TEXT,
          source_url TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE (name)
        )
        """,
    ]
    with connect() as conn, conn.cursor() as cur:
        for sql in statements:
            cur.execute(sql)
    print(f"[migrate_v2] applied against {database_url().split('@')[-1]}")


if __name__ == "__main__":
    main()
