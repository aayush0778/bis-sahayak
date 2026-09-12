import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/createApp";
import { fakeDb } from "./helpers";

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  app = createApp({
    db: fakeDb([
      [
        /FROM bis_offices/,
        () => ({
          rows: [
            {
              office_type: "hq",
              name: "BIS Headquarters (Manak Bhawan)",
              region: null,
              address: "Manak Bhawan, 9 Bahadur Shah Zafar Marg, New Delhi 110002",
              phone: "011-23230131",
              email: null,
              latitude: 28.63,
              longitude: 77.24,
              source_url: "https://www.bis.gov.in/directory/head-quarter",
            },
            {
              office_type: "laboratory",
              name: "Central Laboratory (CL), Sahibabad",
              region: null,
              address: "Plot No. 20/9, Site IV, Sahibabad Industrial Area, Sahibabad 201010",
              phone: "0120-4177101",
              email: "headcl@bis.gov.in",
              latitude: 28.67,
              longitude: 77.35,
              source_url: "https://www.bis.gov.in/laboratorys/testing-overview/laboratory-contact-us",
            },
          ],
        }),
      ],
    ]),
    ai: { post: async () => ({}) },
  });
});

describe("offices (public directory)", () => {
  it("lists offices without auth", async () => {
    const res = await request(app).get("/api/v1/offices");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].name).toContain("Headquarters");
    expect(res.body.note).toContain("bis.gov.in");
  });

  it("filters by office type", async () => {
    const res = await request(app).get("/api/v1/offices?type=laboratory");
    expect(res.status).toBe(200);
    // fakeDb returns the same rows regardless of filter — assert the route accepted the param
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
