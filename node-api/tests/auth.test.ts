import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/createApp";
import { fakeDb } from "./helpers";

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const hash = await bcrypt.hash("password123", 4);
  app = createApp({
    db: fakeDb([
      [
        /INSERT INTO users/,
        () => ({ rows: [{ id: "u-1", email: "new@example.com", role: "business", business_name: "Acme" }] }),
      ],
      [
        /SELECT .* FROM users WHERE email/,
        () => ({ rows: [{ id: "u-1", email: "maker@example.com", role: "business", business_name: "Acme", password_hash: hash }] }),
      ],
    ]),
    ai: { post: async () => ({}) },
  });
});

describe("auth", () => {
  it("registers a business user and returns a JWT", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "new@example.com", password: "password123", role: "business", businessName: "Acme" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("business");
  });

  it("rejects weak passwords with 422", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "x@example.com", password: "short", role: "consumer" });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].path).toBe("password");
  });

  it("logs in with valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "maker@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "maker@example.com", password: "wrongpass1" });
    expect(res.status).toBe(401);
  });

  it("protects /auth/me behind a JWT", async () => {
    const noToken = await request(app).get("/api/v1/auth/me");
    expect(noToken.status).toBe(401);

    const login = await request(app).post("/api/v1/auth/login").send({ email: "maker@example.com", password: "password123" });
    const ok = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe("maker@example.com");
  });
});
