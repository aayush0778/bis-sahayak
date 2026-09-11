"""Shared helpers for BIS Sahayak ingestion scripts."""
import json
import os
from pathlib import Path

import psycopg

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SQL_SCHEMA = BASE_DIR.parent / "db" / "init.sql"

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


def run_schema() -> None:
    with connect() as conn, conn.cursor() as cur, open(SQL_SCHEMA, "r", encoding="utf-8") as f:
        cur.execute(f.read())
    print(f"[init_db] schema applied from {SQL_SCHEMA}")


def as_text_list(value):
    if value is None:
        return []
    return [str(v) for v in value]
