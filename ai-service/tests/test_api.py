from fastapi.testclient import TestClient

from app.main import app
from app.routers import rag

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "ai"


def test_answer_contract(monkeypatch):
    monkeypatch.setattr(
        rag.retrieval,
        "retrieve",
        lambda q: [{
            "type": "standard", "ref": "IS 302 (Part 2/Sec 15)", "source_id": "IS 302 (Part 2/Sec 15)",
            "title": "Heating liquids", "source_url": "https://services.bis.gov.in/x",
            "chunk_text": "IS 302 (Part 2/Sec 15): electric kettle — appliances for heating liquids.", "similarity": 0.6,
        }],
    )
    response = client.post("/rag/answer", json={"query": "electric kettle certification", "history": []})
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"answer", "citations", "grounded", "synthesis", "fellBack"}
    assert isinstance(body["citations"], list)
    assert body["citations"][0]["ref"] == "IS 302 (Part 2/Sec 15)"


def test_applicability_contract(monkeypatch):
    monkeypatch.setattr(
        rag, "query_rows",
        lambda sql, params=(): (
            [{
                "is_number": "IS 302 (Part 2/Sec 15)",
                "title": "Household and similar electrical appliances — Safety — Part 2: appliances for heating liquids",
                "group": "Electrotechnical", "sub_group": "Household Electrical Appliances",
                "sub_sub_group": None, "certification_scheme": "ISI (Scheme I)",
                "aliases": ["electric kettle"], "source_url": "https://services.bis.gov.in/x",
            }]
            if "FROM standards" in sql
            else [{
                "title": "Safety of Household, Commercial and Similar Electrical Appliances (Quality Control) Order, 2026",
                "product_categories": ["electric kettles"],
                "applicable_is_numbers": ["IS 302 (Part 2/Sec 15)"],
                "effective_date": "2026-10-01", "issuing_authority": "DPIIT",
                "scheme": "ISI (Scheme I)", "summary": "s", "source_url": "https://example.org/q",
            }]
        ),
    )
    response = client.post("/rag/applicability", json={"productDescription": "I make electric kettles"})
    assert response.status_code == 200
    body = response.json()
    assert body["mandatory"] is True
    assert body["standards"][0]["is_number"] == "IS 302 (Part 2/Sec 15)"
    assert "why" in body


def test_complaint_draft_contract(monkeypatch):
    monkeypatch.setattr(
        rag, "query_rows",
        lambda sql, params=(): [{
            "is_number": "IS 2347:2017", "title": "Domestic pressure cookers — Specification",
            "group": "Mechanical Engineering", "sub_group": "Kitchen Appliances",
            "sub_sub_group": None, "certification_scheme": "ISI (Scheme I)",
            "aliases": ["pressure cooker"], "source_url": "https://services.bis.gov.in/y",
        }],
    )
    response = client.post(
        "/rag/complaint-draft",
        json={"productDescription": "pressure cooker lid burst", "defectDescription": "The lid burst while cooking"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "draft" in body and "body" in body["draft"]
    assert isinstance(body["citations"], list)


def test_embed_contract():
    response = client.post("/embed", json={"text": "aluminium utensils"})
    assert response.status_code == 200
    body = response.json()
    assert body["model"]
    assert len(body["embedding"]) > 0


def test_validation_rejects_empty_query():
    response = client.post("/rag/answer", json={"query": ""})
    assert response.status_code == 422
