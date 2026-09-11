import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { fakeDb, stubAi } from "./helpers";

const draftResponse = {
  draft: { category: "Kitchen Appliances", relatedRecordNumber: "CM/L-8200123456", body: "Subject: Quality complaint..." },
  citations: [{ type: "standard", ref: "IS 2347:2017", source_url: "https://services.bis.gov.in/x" }],
};

let token: string;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const authApp = createApp({
    db: fakeDb([[ /INSERT INTO users/, () => ({ rows: [{ id: "u-8", email: "p@example.com", role: "consumer", business_name: null }] }) ]]),
    ai: { post: async () => ({}) },
  });
  token = (await request(authApp).post("/api/v1/auth/register").send({ email: "p@example.com", password: "password123", role: "consumer" })).body.token;

  app = createApp({
    db: fakeDb([
      [/INSERT INTO complaints/, () => ({ rows: [{ id: "c-1", status: "draft", draft: draftResponse.draft }] })],
      [/SELECT .* FROM complaints WHERE user_id/, () => ({ rows: [{ id: "c-1", status: "draft" }] })],
      [/UPDATE complaints SET status/, () => ({ rows: [{ id: "c-1", status: "submitted" }] })],
    ]),
    ai: stubAi({ "/rag/complaint-draft": draftResponse }),
  });
});

describe("complaints", () => {
  it("drafts and stores a complaint via the AI service", async () => {
    const res = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${token}`)
      .send({ productDescription: "pressure cooker lid burst", defectDescription: "The lid burst while cooking rice" });
    expect(res.status).toBe(201);
    expect(res.body.complaint.status).toBe("draft");
    expect(res.body.complaint.draft.category).toBe("Kitchen Appliances");
    expect(res.body.citations[0].ref).toBe("IS 2347:2017");
  });

  it("validates the payload", async () => {
    const res = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${token}`)
      .send({ productDescription: "x" });
    expect(res.status).toBe(422);
  });

  it("submits a draft complaint", async () => {
    const res = await request(app).patch("/api/v1/complaints/c-1/submit").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("submitted");
  });
});
