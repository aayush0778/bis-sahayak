import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { fakeDb } from "./helpers";

const items = [
  { id: "q-1", title: "Electrical Appliances QCO 2026", effective_date: "2026-10-01", product_categories: ["electric kettles"] },
  { id: "q-2", title: "Aluminium QCO 2026", effective_date: "2026-03-11", product_categories: ["aluminium utensils"] },
];

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  app = createApp({
    db: fakeDb([
      [/SELECT count/, () => ({ rows: [{ total: 2 }] })],
      [/SELECT id, title/, (sql, params) => {
        const filter = String(params?.[0] ?? "");
        return { rows: filter ? items.filter((i) => i.product_categories.some((c) => c.includes(filter.replaceAll("%", "")))) : items };
      }],
    ]),
    ai: { post: async () => ({}) },
  });
});

describe("qco feed", () => {
  it("returns the full feed when unauthenticated (public)", async () => {
    const res = await request(app).get("/api/v1/qco/feed");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.page).toBe(1);
  });

  it("filters by category", async () => {
    const res = await request(app).get("/api/v1/qco/feed?category=aluminium");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe("Aluminium QCO 2026");
  });
});
