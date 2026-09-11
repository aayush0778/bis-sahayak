import os

import psycopg


def database_url() -> str:
    return os.environ.get("DATABASE_URL", "postgresql://bis:bis@localhost:5432/bis")


def query(sql: str, params: tuple = ()) -> list[tuple]:
    """Run one query and return all rows (per-call connection; corpus traffic is tiny)."""
    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall() if cur.description else []


def query_rows(sql: str, params: tuple = ()) -> list[dict]:
    """Same as query(), but rows come back as dicts keyed by column name."""
    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        if not cur.description:
            return []
        cols = [d.name for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
