"""Seed the `standards` table from the curated JSON corpus.

The corpus is a hand-curated subset of the public BIS "Know Your Standards"
catalogue (services.bis.gov.in), prioritising standards referenced by
2020-2026 QCOs so the applicability engine overlaps with the QCO radar.
Each row keeps a source_url pointing at the official catalogue.
"""
from common import STANDARDS_CATALOGUE_URL, as_text_list, connect, load_json

SQL = """
INSERT INTO standards (
  is_number, title, "group", sub_group, sub_sub_group, certification_scheme,
  superseding_is, superseded_is, cross_referenced_is, aliases, technical_committee, source_url
) VALUES (
  %(is_number)s, %(title)s, %(group)s, %(sub_group)s, %(sub_sub_group)s, %(certification_scheme)s,
  %(superseding_is)s, %(superseded_is)s, %(cross_referenced_is)s, %(aliases)s, %(technical_committee)s, %(source_url)s
)
ON CONFLICT (is_number) DO UPDATE SET
  title = EXCLUDED.title,
  "group" = EXCLUDED."group",
  sub_group = EXCLUDED.sub_group,
  sub_sub_group = EXCLUDED.sub_sub_group,
  certification_scheme = EXCLUDED.certification_scheme,
  superseding_is = EXCLUDED.superseding_is,
  superseded_is = EXCLUDED.superseded_is,
  cross_referenced_is = EXCLUDED.cross_referenced_is,
  aliases = EXCLUDED.aliases,
  technical_committee = EXCLUDED.technical_committee,
  source_url = EXCLUDED.source_url
"""


def main() -> None:
    records = load_json("standards.json")
    with connect() as conn, conn.cursor() as cur:
        for r in records:
            cur.execute(
                SQL,
                {
                    "is_number": r["is_number"],
                    "title": r["title"],
                    "group": r.get("group"),
                    "sub_group": r.get("sub_group"),
                    "sub_sub_group": r.get("sub_sub_group"),
                    "certification_scheme": r.get("certification_scheme"),
                    "superseding_is": r.get("superseding_is"),
                    "superseded_is": r.get("superseded_is"),
                    "cross_referenced_is": as_text_list(r.get("cross_referenced_is")),
                    "aliases": as_text_list(r.get("aliases")),
                    "technical_committee": r.get("technical_committee"),
                    "source_url": r.get("source_url", STANDARDS_CATALOGUE_URL),
                },
            )
    print(f"[seed_standards] upserted {len(records)} standards")


if __name__ == "__main__":
    main()
