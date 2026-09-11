import { describe, expect, it } from "vitest";
import { affectsWatched, daysUntil, feedCategories, formatDate, qcoStatus, statusColor } from "../src/lib/format";

describe("feedCategories", () => {
  it("collects unique lowercased categories", () => {
    const cats = feedCategories([
      { product_categories: ["Electric Kettles", "kitchen appliances"] },
      { product_categories: ["kitchen appliances", "toys"] },
    ]);
    expect(cats).toEqual(["electric kettles", "kitchen appliances", "toys"]);
  });
});

describe("affectsWatched", () => {
  const item = { product_categories: ["household electrical appliances"] };

  it("matches exact category", () => {
    expect(affectsWatched(item, ["household electrical appliances"])).toBe(true);
  });

  it("matches when a watched name is contained in the category", () => {
    expect(affectsWatched(item, ["electrical appliances"])).toBe(true);
    expect(affectsWatched(item, ["household electrical"])).toBe(true);
  });

  it("does not match unrelated watches", () => {
    expect(affectsWatched(item, ["cement", "toys"])).toBe(false);
    expect(affectsWatched(item, [])).toBe(false);
  });
});

describe("qcoStatus / daysUntil", () => {
  const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

  it("marks past dates as in-force and future as upcoming", () => {
    expect(qcoStatus(past)).toBe("in-force");
    expect(qcoStatus(future)).toBe("upcoming");
    expect(qcoStatus(null)).toBe("in-force");
  });

  it("counts days until a future date", () => {
    expect(daysUntil(future)).toBe(5);
    expect(daysUntil(past)).toBeLessThan(0);
    expect(daysUntil(null)).toBeNull();
  });
});

describe("formatDate / statusColor", () => {
  it("formats ISO dates in Indian style and dashes nulls", () => {
    expect(formatDate("2026-10-01")).toMatch(/Oct.*2026/);
    expect(formatDate(null)).toBe("—");
  });

  it("maps verification statuses to color classes", () => {
    expect(statusColor("active")).toContain("emerald");
    expect(statusColor("suspended")).toContain("amber");
    expect(statusColor("cancelled")).toContain("red");
    expect(statusColor("expired")).toContain("slate");
  });
});
