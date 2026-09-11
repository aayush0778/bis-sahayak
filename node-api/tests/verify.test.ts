import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { fakeDb } from "./helpers";

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  app = createApp({
    db: fakeDb([
      [
        /FROM verification_records/,
        (sql, params) => {
          const number = String(params?.[1] ?? "");
          if (number.includes("23456")) {
            return {
              rows: [
                {
                  record_type: "CM/L",
                  record_number: "CM/L-8200123456",
                  holder_name: "Suvidha Appliances Pvt. Ltd.",
                  product_scope: "Domestic pressure cookers as per IS 2347:2017",
                  status: "active",
                  valid_until: "2027-05-31",
                },
              ],
            };
          }
          return { rows: [] };
        },
      ],
    ]),
    ai: { post: async () => ({}) },
  });
});

describe("verify", () => {
  it("finds an active CM/L record", async () => {
    const res = await request(app).get(`/api/v1/verify/cml/${encodeURIComponent("CM/L-8200123456")}`);
    expect(res.status).toBe(200);
    expect(res.body.record.status).toBe("active");
    expect(res.body.record.holderName).toBe("Suvidha Appliances Pvt. Ltd.");
  });

  it("404s for an unknown number", async () => {
    const res = await request(app).get(`/api/v1/verify/cml/${encodeURIComponent("CM/L-9999999999")}`);
    expect(res.status).toBe(404);
  });

  it("rejects an invalid type", async () => {
    const res = await request(app).get("/api/v1/verify/xyz/123");
    expect(res.status).toBe(400);
  });
});
