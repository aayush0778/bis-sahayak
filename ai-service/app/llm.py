"""LLM synthesis — swappable provider plus a deterministic offline fallback.

With LLM_API_KEY unset (the default) the service uses the built-in extractive
synthesizer: every sentence comes from a retrieved, cited chunk, so the demo
never hallucinates and never needs network access. Setting an OpenAI-compatible
key/base URL upgrades answer quality without touching retrieval or contracts.
"""
import os
import re
import time

from .prompts import ANSWER_SYSTEM_PROMPT, COMPLAINT_SYSTEM_PROMPT

API_KEY = os.environ.get("LLM_API_KEY", "")
BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1")
MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini")
# Free-tier endpoints stall and rate-limit: hard per-call timeout, one retry.
LLM_TIMEOUT_S = float(os.environ.get("LLM_TIMEOUT_S", "12"))
LLM_RETRY_WAIT_S = float(os.environ.get("LLM_RETRY_WAIT_S", "1"))


def _trim(text: str, limit: int = 300) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


def _call_llm(system: str, user: str) -> str | None:
    """One LLM attempt with a hard timeout; never raises.

    Free-tier endpoints rate-limit and stall, so callers get None on any
    failure and fall back to the extractive synthesizer.
    """
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
            timeout=LLM_TIMEOUT_S,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception:  # noqa: BLE001 — degrade to the offline synthesizer, never fail the demo
        return None


def _call_llm_with_retry(system: str, user: str) -> str | None:
    """Timeout + one retry (the brief's resilience requirement for rate-limited free tiers)."""
    for attempt in range(2):
        result = _call_llm(system, user)
        if result is not None:
            return result
        if attempt == 0:
            time.sleep(LLM_RETRY_WAIT_S)
    return None


def synthesize_answer(query: str, blocks: list[dict]) -> tuple[str, str, bool]:
    """Compose a citation-grounded answer for the retrieved chunks.

    Returns (answer, synthesis, fell_back):
      synthesis  — "llm" when the model wrote it, "corpus" for the extractive composer
      fell_back  — True when the LLM was attempted but failed and the composer took over
    """
    user_content = "\n\n".join(
        f"[{i + 1}] ({b['ref']})\n{_trim(b['chunk_text'], 500)}" for i, b in enumerate(blocks)
    )
    if API_KEY:
        llm = _call_llm_with_retry(ANSWER_SYSTEM_PROMPT, f"Question: {query}\n\nContext blocks:\n{user_content}")
        if llm:
            return llm, "llm", False
        answer = _extractive_answer(query, blocks)
        return answer, "corpus", True
    return _extractive_answer(query, blocks), "corpus", False


def _extractive_answer(query: str, blocks: list[dict]) -> str:
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
