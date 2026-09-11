from app.applicability import evaluate_applicability, match_standards


def test_kettle_description_matches_heating_liquids_standard(sample_standards):
    matches = match_standards("I manufacture electric kettles for household use", sample_standards)
    assert matches
    assert matches[0]["is_number"] == "IS 302 (Part 2/Sec 15)"


def test_literal_is_number_mention_ranks_first(sample_standards):
    matches = match_standards("Tell me about IS 2347:2017 compliance", sample_standards)
    assert matches[0]["is_number"] == "IS 2347:2017"


def test_unrelated_description_returns_no_matches(sample_standards):
    matches = match_standards("space rocket fuel valves", sample_standards)
    assert matches == []


def test_pressure_cooker_is_mandatory_via_qco(sample_standards, sample_qcos):
    result = evaluate_applicability("I make domestic pressure cookers", None, sample_standards, sample_qcos)
    assert result["mandatory"] is True
    assert result["qcoRefs"][0]["ref"] == "Domestic Pressure Cooker (Quality Control) Order, 2020"
    assert "IS 2347:2017" in result["qcoRefs"][0]["standards"]


def test_plywood_without_qco_is_not_mandatory(sample_standards, sample_qcos):
    result = evaluate_applicability("marine plywood sheets for boat building", None, sample_standards, sample_qcos)
    assert result["mandatory"] is False
    assert result["qcoRefs"] == []
    assert result["standards"][0]["is_number"] == "IS 303"


def test_transition_facilitation_appears_as_concession_not_mandatory(sample_standards, sample_qcos):
    result = evaluate_applicability(
        "electric kettles", "kitchen appliances", sample_standards, sample_qcos
    )
    assert result["mandatory"] is True  # via the electrical appliances QCO
    refs = {r["ref"] for r in result["concessionRoutes"]}
    assert not any("Transition" in r for r in [x["ref"] for x in result["qcoRefs"]])
    assert refs == set()  # transition order matches toys/footwear/furniture, not kettles


def test_scheme_resolved_from_qco_before_standard(sample_standards, sample_qcos):
    result = evaluate_applicability("domestic pressure cookers", None, sample_standards, sample_qcos)
    assert result["scheme"] == "ISI (Scheme I)"
