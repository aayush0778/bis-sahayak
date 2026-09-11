"""Shared helpers for BIS Sahayak ingestion scripts."""
import json
import os
from pathlib import Path

import psycopg

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

DEFAULT_DATABASE_URL = "postgresql://bis:bis@localhost:5432/bis"
STANDARDS_CATALOGUE_URL = (
    "https://services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/Indian_standards"
)


def database_url() -> str:
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)


def connect():
    return psycopg.connect(database_url())


def load_json(name: str):
    with open(DATA_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)


def sql_schema_paths():
    """Schema candidates: repo layout (../db/init.sql) and bootstrap image layout (./db-init.sql)."""
    return [BASE_DIR.parent / "db" / "init.sql", BASE_DIR / "db-init.sql"]


def run_schema() -> None:
    schema = next((p for p in sql_schema_paths() if p.exists()), None)
    if schema is None:
        raise FileNotFoundError(f"init.sql not found in any of {[str(p) for p in sql_schema_paths()]}")
    with connect() as conn, conn.cursor() as cur, open(schema, "r", encoding="utf-8") as f:
        cur.execute(f.read())
    print(f"[init_db] schema applied from {schema}")


def as_text_list(value):
    if value is None:
        return []
    return [str(v) for v in value]
