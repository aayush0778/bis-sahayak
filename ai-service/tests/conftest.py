import pytest


@pytest.fixture()
def sample_standards():
    return [
        {
            "is_number": "IS 302 (Part 2/Sec 15)",
            "title": "Household and similar electrical appliances — Safety — Part 2: Particular requirements for appliances for heating liquids",
            "group": "Electrotechnical",
            "sub_group": "Household Electrical Appliances",
            "sub_sub_group": None,
            "certification_scheme": "ISI (Scheme I)",
            "aliases": ["electric kettle", "immersion water heater", "rice cooker"],
            "source_url": "https://services.bis.gov.in/x",
        },
        {
            "is_number": "IS 2347:2017",
            "title": "Domestic pressure cookers — Specification",
            "group": "Mechanical Engineering",
            "sub_group": "Kitchen Appliances",
            "sub_sub_group": None,
            "certification_scheme": "ISI (Scheme I)",
            "aliases": ["pressure cooker", "cooker"],
            "source_url": "https://services.bis.gov.in/y",
        },
        {
            "is_number": "IS 303",
            "title": "Plywood for general purposes — Specification",
            "group": "Civil Engineering",
            "sub_group": "Wood Products",
            "sub_sub_group": None,
            "certification_scheme": "ISI (Scheme I)",
            "aliases": ["plywood", "MR plywood"],
            "source_url": "https://services.bis.gov.in/z",
        },
    ]


@pytest.fixture()
def sample_qcos():
    return [
        {
            "title": "Safety of Household, Commercial and Similar Electrical Appliances (Quality Control) Order, 2026",
            "product_categories": ["electric kettles", "kitchen appliances"],
            "applicable_is_numbers": ["IS 302 (Part 1):2024", "IS 302 (Part 2/Sec 15)"],
            "effective_date": "2026-10-01",
            "issuing_authority": "DPIIT",
            "scheme": "ISI (Scheme I)",
            "summary": "Mandatory BIS certification for ~90 appliance categories.",
            "source_url": "https://example.org/electrical-qco",
        },
        {
            "title": "Domestic Pressure Cooker (Quality Control) Order, 2020",
            "product_categories": ["pressure cookers", "cookware"],
            "applicable_is_numbers": ["IS 2347:2017"],
            "effective_date": "2020-08-01",
            "issuing_authority": "DPIIT",
            "scheme": "ISI (Scheme I)",
            "summary": "ISI mark mandatory for domestic pressure cookers.",
            "source_url": "https://example.org/cooker-qco",
        },
        {
            "title": "Transition Facilitation (Quality Control) Order, 2026",
            "product_categories": ["toys", "footwear", "furniture"],
            "applicable_is_numbers": [],
            "effective_date": "2026-03-19",
            "issuing_authority": "DPIIT",
            "scheme": "Scheme II (transition route)",
            "summary": "Alternative compliance pathway for eligible manufacturers.",
            "source_url": "https://example.org/transition-qco",
        },
    ]
