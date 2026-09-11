import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import { signToken, requireAuth } from "../middleware/auth";
import type { AuthUser } from "../types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "password must be at least 8 characters"),
  role: z.enum(["consumer", "business"]),
  businessName: z.string().max(200).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(row: AuthUser & { business_name?: string | null }): AuthUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    businessName: row.business_name ?? row.businessName ?? null,
  };
}

export function authRouter(db: DB): Router {
  const router = Router();

  router.post("/auth/register", async (req, res, next) => {
    try {
      const body = registerSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(body.password, 10);
      const result = await db.query(
        "INSERT INTO users (email, password_hash, role, business_name) VALUES ($1, $2, $3, $4) " +
          "RETURNING id, email, role, business_name",
        [body.email.toLowerCase(), passwordHash, body.role, body.role === "business" ? body.businessName ?? null : null],
      );
      const user = publicUser(result.rows[0] as never);
      res.status(201).json({ token: signToken(user), user });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        (err as { code?: string }).code === "23505" // unique_violation
      ) {
        res.status(409).json({ error: { message: "An account with this email already exists" } });
        return;
      }
      next(err);
    }
  });

  router.post("/auth/login", async (req, res, next) => {
    try {
      const body = loginSchema.parse(req.body);
      const result = await db.query(
        "SELECT id, email, role, business_name, password_hash FROM users WHERE email = $1",
        [body.email.toLowerCase()],
      );
      const row = result.rows[0] as
        | { id: string; email: string; role: AuthUser["role"]; business_name: string | null; password_hash: string }
        | undefined;
      if (!row || !(await bcrypt.compare(body.password, row.password_hash))) {
        res.status(401).json({ error: { message: "Invalid email or password" } });
        return;
      }
      const user = publicUser(row);
      res.json({ token: signToken(user), user });
    } catch (err) {
      next(err);
    }
  });

  router.get("/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
