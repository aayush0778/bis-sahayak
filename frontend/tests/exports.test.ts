import { describe, expect, it } from "vitest";
import { complianceNote, haversineKm, icsForQcos } from "../src/lib/exports";
import type { ApplicabilityResult } from "../src/lib/api";

describe("haversineKm", () => {
  it("computes sane city distances (Delhi -> Chandigarh ≈ 240-260 km)", () => {
    const km = haversineKm(28.61, 77.21, 30.73, 76.78);
    expect(km).toBeGreaterThan(200);
    expect(km).toBeLessThan(280);
  });

  it("returns ~0 for identical points", () => {
    expect(haversineKm(20, 70, 20, 70)).toBeLessThan(0.1);
  });
});

describe("icsForQcos", () => {
  const future = {
    id: "q-1",
    title: "Safety of Household Electrical Appliances (Quality Control) Order, 2026",
    product_categories: ["electric kettles"],
    applicable_is_numbers: ["IS 302 (Part 1):2024"],
    effective_date: "2100-10-01",
    issuing_authority: "DPIIT",
    scheme: "ISI (Scheme I)",
    summary: "Mandatory BIS certification.",
    source_url: "https://example.org/qco",
  };
  const past = { ...future, id: "q-2", effective_date: "2020-09-01" };

  it("includes future orders with alarm and escapes commas", () => {
    const ics = icsForQcos([future]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:21001001");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-P30D");
    expect(ics).toContain("Safety of Household Electrical Appliances (Quality Control) Order\\, 2026");
  });

  it("skips past-dated orders", () => {
    expect(icsForQcos([past])).not.toContain("BEGIN:VEVENT");
  });
});

describe("complianceNote", () => {
  const result: ApplicabilityResult = {
    standards: [
      {
        is_number: "IS 302 (Part 2/Sec 15)",
        title: "Appliances for heating liquids",
        score: 9,
        matched_on: ["electric kettle"],
        certification_scheme: "ISI (Scheme I)",
        source_url: "https://services.bis.gov.in/x",
      },
    ],
    mandatory: true,
    scheme: "ISI (Scheme I)",
    qcoRefs: [
      {
        ref: "Electrical Appliances QCO 2026",
        standards: ["IS 302 (Part 2/Sec 15)"],
        effective_date: "2026-10-01",
        scheme: "ISI (Scheme I)",
        source_url: "https://example.org/qco",
      },
    ],
    concessionRoutes: [],
    why: "Covered by the 2026 QCO.",
  };

  it("renders the finding, standards and QCO with sources", () => {
    const note = complianceNote("electric kettles", "NOA/20260911/ABC123", result);
    expect(note).toContain("MANDATORY");
    expect(note).toContain("IS 302 (Part 2/Sec 15)");
    expect(note).toContain("Electrical Appliances QCO 2026");
    expect(note).toContain("NOA/20260911/ABC123");
    expect(note).toContain("Not a legal opinion");
  });
});
