"""Create (or re-create) the BIS Sahayak schema in Postgres.

Usage:  python ingestion/init_db.py
Requires DATABASE_URL (defaults to postgresql://bis:bis@localhost:5432/bis).
"""
import sys

from common import run_schema

if __name__ == "__main__":
    try:
        run_schema()
        print("[init_db] done")
    except Exception as exc:  # noqa: BLE001
        print(f"[init_db] FAILED: {exc}", file=sys.stderr)
        print("Hint: is Postgres running? If you use Docker: docker compose up -d postgres", file=sys.stderr)
        sys.exit(1)
