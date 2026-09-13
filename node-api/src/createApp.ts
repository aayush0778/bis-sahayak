import express, { type Express } from "express";
import cors from "cors";
import type { DB } from "./db";
import type { AIClient } from "./aiClient";
import { errorHandler } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { chatRouter } from "./routes/chat";
import { applicabilityRouter } from "./routes/applicability";
import { verifyRouter } from "./routes/verify";
import { qcoRouter } from "./routes/qco";
import { watchesRouter } from "./routes/watches";
import { complaintsRouter } from "./routes/complaints";
import { officesRouter } from "./routes/offices";
import { statsRouter } from "./routes/stats";

export interface AppDeps {
  db: DB;
  ai: AIClient;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get(["/health", "/api/v1/health"], async (_req, res) => {
    const status: Record<string, string> = { service: "node-api", ok: "true", db: "up", ai: "up" };
    try {
      await deps.db.query("SELECT 1");
    } catch {
      status.db = "down";
      status.ok = "false";
    }
    try {
      await deps.ai.post("/embed", { text: "health" });
    } catch {
      status.ai = "down";
      status.ok = "false";
    }
    res.json(status);
  });

  app.use("/api/v1", authRouter(deps.db));
  app.use("/api/v1", chatRouter(deps.db, deps.ai));
  app.use("/api/v1", applicabilityRouter(deps.ai));
  app.use("/api/v1", verifyRouter(deps.db));
  app.use("/api/v1", qcoRouter(deps.db));
  app.use("/api/v1", watchesRouter(deps.db));
  app.use("/api/v1", complaintsRouter(deps.db, deps.ai));
  app.use("/api/v1", officesRouter(deps.db));
  app.use("/api/v1", statsRouter(deps.db));

  app.use((_req, res) => {
    res.status(404).json({ error: { message: "Not found" } });
  });

  app.use(errorHandler);
  return app;
}
