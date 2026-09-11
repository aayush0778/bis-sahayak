"""Turn each seeded row into retrieval unit(s) — public metadata only."""


def chunk_standard(rec: dict) -> list[str]:
    parts = [f"{rec['is_number']}: {rec['title']}."]
    classification = [str(rec.get(key)) for key in ("group", "sub_group", "sub_sub_group") if rec.get(key)]
    if classification:
        parts.append("Classification: " + " > ".join(classification) + ".")
    if rec.get("certification_scheme"):
        parts.append(f"Certification: {rec['certification_scheme']}.")
    if rec.get("superseding_is"):
        parts.append(f"Superseding standard: {rec['superseding_is']}.")
    if rec.get("superseded_is"):
        parts.append(f"Supersedes: {rec['superseded_is']}.")
    xrefs = rec.get("cross_referenced_is") or []
    if xrefs:
        parts.append("Cross-references: " + ", ".join(xrefs) + ".")
    aliases = rec.get("aliases") or []
    if aliases:
        parts.append("Commonly asked-about product names: " + ", ".join(aliases) + ".")
    return ["\n".join(parts)]


def chunk_qco(rec: dict) -> list[str]:
    parts = [f"Quality Control Order (QCO): {rec['title']}."]
    parts.append(f"Issuing authority: {rec.get('issuing_authority')}.")
    if rec.get("effective_date"):
        parts.append(f"Effective date: {rec['effective_date']}.")
    if rec.get("scheme"):
        parts.append(f"Certification scheme: {rec['scheme']}.")
    categories = rec.get("product_categories") or []
    if categories:
        parts.append("Product categories covered: " + ", ".join(categories) + ".")
    numbers = rec.get("applicable_is_numbers") or []
    if numbers:
        parts.append("Applicable Indian Standards: " + ", ".join(numbers) + ".")
    if rec.get("summary"):
        parts.append("Summary: " + rec["summary"])
    return ["\n".join(parts)]
