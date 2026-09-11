"""Applicability Engine — deterministic product -> standards -> QCO coverage.

The `mandatory` flag is derived from actual QCO coverage in the database
(IS-number intersection), never from LLM guesswork (spec Section 13).
"""
import re

from .embeddings import tokenize

IS_NUMBER_RE = re.compile(r"(?:IS\s*/?\s*IEC\s*|IS\s*)\d{2,5}(?:\s*\([^)]*\))?(?::\d{4})?", re.IGNORECASE)


def match_standards(description: str, standards: list[dict], limit: int = 6) -> list[dict]:
    """Score standards against a free-text product description.

    Signals: literal IS-number mention (strong), alias phrase hit, title-token
    overlap, group/sub-group token overlap. Pure function — unit-testable.
    Matches below MIN_MATCH_SCORE are discarded: a single title-token graze
    ("sheets" matching steel-sheet standards) is noise, not an applicability hit.
    """
    min_score = 2.5
    text = " " + description.lower() + " "
    query_tokens = set(tokenize(description))
    literal_numbers = {m.group(0).upper().replace(" ", "") for m in IS_NUMBER_RE.finditer(description)}

    scored = []
    for s in standards:
        score = 0.0
        matched_on = []

        for alias in s.get("aliases") or []:
            if alias and alias.lower() in text:
                score += 4.0
                matched_on.append(alias)

        if s["is_number"].upper().replace(" ", "") in literal_numbers:
            score += 10.0
            matched_on.append(s["is_number"])

        title_tokens = set(tokenize(s["title"]))
        title_hits = query_tokens & title_tokens
        if title_hits:
            # Title tokens are shared across the IS 302 family, so damp generic words.
            score += 0.8 * len(title_hits)
            matched_on.append(f"title:{'/'.join(sorted(title_hits))}")

        class_tokens = set()
        for key in ("group", "sub_group", "sub_sub_group"):
            if s.get(key):
                class_tokens.update(tokenize(str(s[key])))
        class_hits = query_tokens & class_tokens
        if class_hits:
            score += 0.5 * len(class_hits)

        if score >= min_score:
            scored.append({"score": score, "matched_on": matched_on, **s})

    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored[:limit]


def _qco_covers(qco: dict, matched_is_numbers: set[str]) -> bool:
    return bool(set(qco.get("applicable_is_numbers") or []) & matched_is_numbers)


def _category_overlap(qco: dict, description: str, category: str | None) -> bool:
    text = (category or "") + " " + description
    text = text.lower()
    for cat in qco.get("product_categories") or []:
        if cat and cat.lower() in text:
            return True
    return False


def evaluate_applicability(
    description: str,
    category: str | None,
    standards: list[dict],
    qcos: list[dict],
    source_urls: dict[str, str] | None = None,
) -> dict:
    """Return the structured applicability result for a product description."""
    source_urls = source_urls or {}
    matches = match_standards(description, standards)
    matched_numbers = {m["is_number"] for m in matches}

    qco_refs = []
    concession_routes = []
    for q in qcos:
        covered_by = sorted(set(q.get("applicable_is_numbers") or []) & matched_numbers)
        if covered_by:
            qco_refs.append(
                {
                    "ref": q["title"],
                    "standards": covered_by,
                    "effective_date": q.get("effective_date"),
                    "scheme": q.get("scheme"),
                    "source_url": q.get("source_url"),
                    "match_basis": "standards",
                }
            )
        elif not (q.get("applicable_is_numbers") or []) and _category_overlap(q, description, category):
            # Mechanism/concession orders (e.g. Transition Facilitation QCO) carry
            # no IS numbers of their own — surface them as routes, never as mandatory triggers.
            concession_routes.append(
                {
                    "ref": q["title"],
                    "effective_date": q.get("effective_date"),
                    "scheme": q.get("scheme"),
                    "source_url": q.get("source_url"),
                    "match_basis": "category",
                }
            )

    mandatory = bool(qco_refs)
    scheme = None
    if qco_refs:
        scheme = next((r["scheme"] for r in qco_refs if r["scheme"]), None)
    if not scheme:
        scheme = next((m.get("certification_scheme") for m in matches if m.get("certification_scheme")), None)

    for m in matches:
        m["source_url"] = source_urls.get(m["is_number"], m.get("source_url"))

    return {
        "standards": [
            {
                "is_number": m["is_number"],
                "title": m["title"],
                "score": round(m["score"], 2),
                "matched_on": m["matched_on"][:4],
                "certification_scheme": m.get("certification_scheme"),
                "source_url": m.get("source_url"),
            }
            for m in matches
        ],
        "mandatory": mandatory,
        "scheme": scheme,
        "qcoRefs": qco_refs,
        "concessionRoutes": concession_routes,
    }
