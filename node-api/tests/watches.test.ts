import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { fakeDb, stubAi } from "./helpers";

let token: string;
let app: ReturnType<typeof createApp>;
let authApp: ReturnType<typeof createApp>;

beforeAll(async () => {
  authApp = createApp({
    db: fakeDb([[ /INSERT INTO users/, () => ({ rows: [{ id: "u-9", email: "w@example.com", role: "business", business_name: null }] })]]),
    ai: { post: async () => ({}) },
  });
  token = (await request(authApp).post("/api/v1/auth/register").send({ email: "w@example.com", password: "password123", role: "business" })).body.token;

  app = createApp({
    db: fakeDb([
      [/SELECT .* FROM watches WHERE user_id/, () => ({ rows: [{ id: "w-1", product_category: "aluminium utensils", created_at: "2026-01-01" }] })],
      [/INSERT INTO watches/, () => ({ rows: [{ id: "w-2", product_category: "electric kettles", created_at: "2026-01-02" }] })],
      [/DELETE FROM watches/, () => ({ rows: [{ id: "w-1" }] })],
    ]),
    ai: stubAi({}),
  });
});

describe("watches", () => {
  it("lists watches", async () => {
    const res = await request(app).get("/api/v1/watches").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items[0].product_category).toBe("aluminium utensils");
  });

  it("creates a watch", async () => {
    const res = await request(app)
      .post("/api/v1/watches")
      .set("Authorization", `Bearer ${token}`)
      .send({ productCategory: "electric kettles" });
    expect(res.status).toBe(201);
    expect(res.body.product_category).toBe("electric kettles");
  });

  it("rejects an empty category", async () => {
    const res = await request(app).post("/api/v1/watches").set("Authorization", `Bearer ${token}`).send({ productCategory: "" });
    expect(res.status).toBe(422);
  });

  it("deletes a watch", async () => {
    const res = await request(app).delete("/api/v1/watches/w-1").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it("404s deleting someone else's watch", async () => {
    const lonely = createApp({
      db: fakeDb([[ /DELETE FROM watches/, () => ({ rows: [] }) ]]),
      ai: stubAi({}),
    });
    const res = await request(lonely).delete("/api/v1/watches/nope").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
