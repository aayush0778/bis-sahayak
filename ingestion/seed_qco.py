"""Seed the `qco_notifications` table from the curated JSON corpus.

Every QCO in the corpus is a real, named notification with a source_url
(gazette PDF, DPIIT notice, or a documented secondary tracker) — see
SIH26107 spec Sections 6 and 9.2.
"""
from common import as_text_list, connect, load_json

SQL = """
INSERT INTO qco_notifications (
  title, product_categories, applicable_is_numbers, effective_date,
  issuing_authority, scheme, summary, source_url
) VALUES (
  %(title)s, %(product_categories)s, %(applicable_is_numbers)s, %(effective_date)s,
  %(issuing_authority)s, %(scheme)s, %(summary)s, %(source_url)s
)
"""


def main() -> None:
    records = load_json("qco_notifications.json")
    with connect() as conn, conn.cursor() as cur:
        for r in records:
            # Idempotent by title: re-seeding replaces the previous version of the same order.
            cur.execute("DELETE FROM qco_notifications WHERE title = %s", (r["title"],))
            cur.execute(
                SQL,
                {
                    "title": r["title"],
                    "product_categories": as_text_list(r["product_categories"]),
                    "applicable_is_numbers": as_text_list(r["applicable_is_numbers"]),
                    "effective_date": r["effective_date"],
                    "issuing_authority": r["issuing_authority"],
                    "scheme": r.get("scheme"),
                    "summary": r["summary"],
                    "source_url": r["source_url"],
                },
            )
    print(f"[seed_qco] upserted {len(records)} QCO notifications")


if __name__ == "__main__":
    main()
