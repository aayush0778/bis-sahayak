import type { ErrorRequestHandler, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { config } from "../config";
import type { AuthUser } from "../types";

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: "7d",
  });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: { message: "Authentication required" } });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      email: string;
      role: AuthUser["role"];
    };
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: { message: "Validation failed", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
    });
    return;
  }
  const status = typeof (err as { status?: number }).status === "number" ? (err as { status: number }).status : 500;
  if (status !== 500) {
    res.status(status).json({ error: { message: (err as Error).message } });
    return;
  }
  console.error("[api] unhandled error:", err);
  res.status(500).json({ error: { message: "Internal server error" } });
};
