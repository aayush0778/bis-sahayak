"""LLM synthesis — swappable provider plus a deterministic offline fallback.

With LLM_API_KEY unset (the default) the service uses the built-in extractive
synthesizer: every sentence comes from a retrieved, cited chunk, so the demo
never hallucinates and never needs network access. Setting an OpenAI-compatible
key/base URL upgrades answer quality without touching retrieval or contracts.
"""
import os
import re

from .prompts import ANSWER_SYSTEM_PROMPT, COMPLAINT_SYSTEM_PROMPT

API_KEY = os.environ.get("LLM_API_KEY", "")
BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1")
MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini")


def _trim(text: str, limit: int = 300) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


def _call_llm(system: str, user: str) -> str | None:
    if not API_KEY:
        return None
    try:
        import httpx

        response = httpx.post(
            f"{BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={
                "model": MODEL,
                "temperature": 0.1,
                "max_tokens": 400,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=40.0,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception:  # noqa: BLE001 — degrade to the offline synthesizer, never fail the demo
        return None


def synthesize_answer(query: str, blocks: list[dict]) -> str:
    """Compose a citation-grounded answer for the retrieved chunks."""
    user_content = "\n\n".join(
        f"[{i + 1}] ({b['ref']})\n{_trim(b['chunk_text'], 500)}" for i, b in enumerate(blocks)
    )
    llm = _call_llm(ANSWER_SYSTEM_PROMPT, f"Question: {query}\n\nContext blocks:\n{user_content}")
    if llm:
        return llm

    lines = [
        f"Here is what BIS Sahayak's seeded corpus (BIS Know-Your-Standards metadata and "
        f"QCO notifications) has on file for \"{_trim(query, 120)}\":",
        "",
    ]
    for i, b in enumerate(blocks, 1):
        lines.append(f"• {_trim(b['chunk_text'], 320)}  [{b['ref']}]")
    lines += [
        "",
        "Every bullet above comes straight from the cited record — open a citation chip to verify "
        "it at the official source. For the legally binding text, always consult the Gazette or "
        "services.bis.gov.in.",
    ]
    return "\n".join(lines)


def synthesize_complaint(product: str, defect: str, record_number: str | None, category: str | None) -> str:
    context = f"Product: {product}\nDefect: {defect}\n"
    if record_number:
        context += f"Licence/registration number given by user: {record_number}\n"
    if category:
        context += f"Product category: {category}\n"
    llm = _call_llm(
        COMPLAINT_SYSTEM_PROMPT,
        context + "\nWrite the structured complaint draft (subject, description, request).",
    )
    if llm:
        return llm

    subject = f"Quality complaint — {_trim(product, 80)}"
    body_lines = [
        f"Subject: {subject}",
        "",
        f"Product: {_trim(product, 200)}",
        f"Nature of defect: {_trim(defect, 400)}",
    ]
    if record_number:
        body_lines.append(
            f"Mark/licence/registration number on the product (as provided by the complainant): {record_number}"
        )
    if category:
        body_lines.append(f"Product category (best match in BIS corpus): {category}")
    body_lines += [
        "",
        "Requested action: Kindly verify the certification status of this product and take appropriate "
        "action under the BIS Act, 2016. I can provide photographs, purchase invoice and further "
        "details on request.",
        "",
        "(Drafted by BIS Sahayak — review, edit, and submit through BIS's official complaint channel.)",
    ]
    return "\n".join(body_lines)
