from app import embeddings
from app.chunking import chunk_qco, chunk_standard


def test_hash_backend_produces_configured_dimension():
    vec = embeddings.embed("electric kettle safety requirement")
    assert len(vec) == embeddings.EMBEDDING_DIM
    assert all(isinstance(x, float) for x in vec)


def test_hash_backend_is_deterministic_and_normalised():
    a = embeddings.embed("domestic pressure cooker ISI mark")
    b = embeddings.embed("domestic pressure cooker ISI mark")
    assert a == b
    norm = sum(x * x for x in a) ** 0.5
    assert abs(norm - 1.0) < 1e-6


def test_different_texts_do_not_collide():
    a = embeddings.embed("plywood marine grade specification")
    b = embeddings.embed("toys safety mechanical properties")
    assert embeddings.cosine(a, b) < 0.9


def test_similar_text_scores_higher_than_dissimilar():
    query = embeddings.embed("electric kettle for boiling water")
    kettle = embeddings.embed("electric kettle safety appliances for heating liquids")
    cement = embeddings.embed("ordinary portland cement 53 grade specification")
    assert embeddings.cosine(query, kettle) > embeddings.cosine(query, cement)


def test_empty_text_gives_zero_vector():
    assert embeddings.embed("") == [0.0] * embeddings.EMBEDDING_DIM


def test_chunk_standard_contains_identity_and_aliases(sample_standards):
    s = sample_standards[0]
    chunk = chunk_standard(s)[0]
    assert s["is_number"] in chunk
    assert "heating liquids" in chunk
    assert "electric kettle" in chunk  # aliases drive retrieval
    assert "ISI (Scheme I)" in chunk


def test_chunk_qco_contains_date_categories_and_standards(sample_qcos):
    q = sample_qcos[0]
    chunk = chunk_qco(q)[0]
    assert "2026-10-01" in chunk
    assert "electric kettles" in chunk
    assert "IS 302 (Part 2/Sec 15)" in chunk
