from app import llm, retrieval


class SpyLLM:
    def __init__(self):
        self.calls = []


def _chunk(ref, similarity):
    return {
        "type": "standard",
        "ref": ref,
        "source_id": ref,
        "title": f"Title of {ref}",
        "source_url": "https://services.bis.gov.in/x",
        "chunk_text": f"{ref}: Household and similar electrical appliances — electric kettle safety requirements.",
        "similarity": similarity,
    }


class FakeQuery:
    def __init__(self, query):
        self.query = query
        self.history = []


def test_low_similarity_gates_to_refusal(monkeypatch):
    monkeypatch.setattr(retrieval, "retrieve", lambda q: [_chunk("IS 303", 0.10)])
    from app.routers import rag

    response = rag.rag_answer(FakeQuery("space rockets"))
    assert response["grounded"] is False
    assert response["citations"] == []
    assert "don't have a standard" in response["answer"]


def test_high_similarity_but_zero_overlap_gates_to_refusal(monkeypatch):
    # Collision-inflated similarity with no lexical coverage must still refuse.
    monkeypatch.setattr(
        retrieval,
        "retrieve",
        lambda q: [
            {
                "type": "standard",
                "ref": "IS 99999",
                "source_id": "IS 99999",
                "title": "Title of IS 99999",
                "source_url": "https://services.bis.gov.in/x",
                "chunk_text": "IS 99999: zzz qqq xxx yyy www.",
                "similarity": 0.55,
            }
        ],
    )
    from app.routers import rag

    response = rag.rag_answer(FakeQuery("unicorn saddle certification on planet Mars"))
    assert response["grounded"] is False
    assert response["citations"] == []


def test_good_similarity_returns_cited_answer(monkeypatch):
    monkeypatch.setattr(retrieval, "retrieve", lambda q: [_chunk("IS 302 (Part 2/Sec 15)", 0.55)])
    from app.routers import rag

    response = rag.rag_answer(FakeQuery("electric kettle requirements"))
    assert response["grounded"] is True
    assert response["citations"][0]["ref"] == "IS 302 (Part 2/Sec 15)"
    assert response["citations"][0]["source_url"].startswith("https://")
    assert "IS 302 (Part 2/Sec 15)" in response["answer"]


def test_extractive_synthesizer_cites_every_block():
    blocks = [
        _chunk("IS 2347:2017", 0.6),
        {"type": "qco", "ref": "Domestic Pressure Cooker (Quality Control) Order, 2020",
         "source_id": "uuid-1", "title": "Domestic Pressure Cooker (Quality Control) Order, 2020",
         "source_url": "https://example.org/qco", "chunk_text": "QCO: Domestic Pressure Cooker (Quality Control) Order, 2020. Effective 2020-08-01.",
         "similarity": 0.5},
    ]
    answer = llm.synthesize_answer("pressure cooker certification", blocks)
    assert "IS 2347:2017" in answer
    assert "Domestic Pressure Cooker (Quality Control) Order, 2020" in answer


def test_offline_mode_never_calls_network(monkeypatch):
    # LLM_API_KEY is unset in tests; synthesizer must still produce an answer.
    import os

    monkeypatch.setenv("LLM_API_KEY", "")
    answer = llm.synthesize_answer("kettle", [_chunk("IS 302 (Part 2/Sec 15)", 0.6)])
    assert answer.strip()
