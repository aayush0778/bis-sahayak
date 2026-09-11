"""Seed the `verification_records` table.

These are *sample* records styled on the real BIS Care lookup fields
(CM/L licence numbers, 6-character HUIDs, CRS registration numbers),
used because BIS's live licence database is access-gated (see spec
Section 6). The demo states this openly.
"""
from common import connect, load_json

SQL = """
INSERT INTO verification_records (
  record_type, record_number, holder_name, product_scope, status, valid_until
) VALUES (
  %(record_type)s, %(record_number)s, %(holder_name)s, %(product_scope)s, %(status)s, %(valid_until)s
)
ON CONFLICT (record_number) DO UPDATE SET
  record_type = EXCLUDED.record_type,
  holder_name = EXCLUDED.holder_name,
  product_scope = EXCLUDED.product_scope,
  status = EXCLUDED.status,
  valid_until = EXCLUDED.valid_until
"""


def main() -> None:
    records = load_json("verification_records.json")
    with connect() as conn, conn.cursor() as cur:
        for r in records:
            cur.execute(SQL, {**r, "valid_until": r.get("valid_until")})
    print(f"[seed_verification] upserted {len(records)} sample verification records")


if __name__ == "__main__":
    main()
