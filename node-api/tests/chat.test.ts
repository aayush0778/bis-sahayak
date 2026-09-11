import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/createApp";
import { fakeDb, stubAi } from "./helpers";

const ragResponse = {
  answer: "Certification is mandatory under the 2026 QCO.",
  citations: [{ type: "qco", ref: "Safety of Household, Commercial and Similar Electrical Appliances (Quality Control) Order, 2026", source_url: "https://example.org/qco" }],
  grounded: true,
};

let token: string;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const ai = stubAi({ "/rag/answer": ragResponse });
  app = createApp({
    db: fakeDb([
      [/INSERT INTO chat_sessions/, () => ({ rows: [{ id: "s-1", title: "New chat", created_at: "2026-01-01" }] })],
      [/FROM chat_sessions WHERE id = \$1 AND user_id/, () => ({ rows: [{ id: "s-1" }] })],
      [/SELECT role, content FROM chat_messages/, () => ({ rows: [] })],
      [/INSERT INTO chat_messages \(session_id, role, content\) VALUES/, () => ({ rows: [] })],
      [/INSERT INTO chat_messages/, () => ({ rows: [{ id: "m-2", role: "assistant", content: ragResponse.answer, citations: ragResponse.citations, grounded: true }] })],
    ]),
    ai,
  });
  // Register via a stubbed user insert to get a token.
  const authApp = createApp({
    db: fakeDb([
      [/INSERT INTO users/, () => ({ rows: [{ id: "u-9", email: "c@example.com", role: "consumer", business_name: null }] })],
    ]),
    ai: { post: async () => ({}) },
  });
  token = (await request(authApp).post("/api/v1/auth/register").send({ email: "c@example.com", password: "password123", role: "consumer" })).body.token;
});

describe("chat", () => {
  it("creates a session", async () => {
    const res = await request(app)
      .post("/api/v1/chat/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Kettle compliance" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe("s-1");
  });

  it("requires auth", async () => {
    const res = await request(app).post("/api/v1/chat/sessions").send({});
    expect(res.status).toBe(401);
  });

  it("posts a message and returns the assistant reply with citations", async () => {
    const res = await request(app)
      .post("/api/v1/chat/sessions/s-1/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Do I need BIS certification for an electric kettle?" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("assistant");
    expect(res.body.citations).toHaveLength(1);
    expect(res.body.citations[0].type).toBe("qco");
  });

  it("rejects empty message bodies", async () => {
    const res = await request(app)
      .post("/api/v1/chat/sessions/s-1/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "" });
    expect(res.status).toBe(422);
  });

  it("404s for a session the user does not own", async () => {
    const lonelyApp = createApp({
      db: fakeDb([[/SELECT id FROM chat_sessions WHERE id = \$1 AND user_id/, () => ({ rows: [] })]]),
      ai: stubAi({}),
    });
    const res = await request(lonelyApp)
      .post("/api/v1/chat/sessions/other/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "hello" });
    expect(res.status).toBe(404);
  });
});
