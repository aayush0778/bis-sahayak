import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import { AiServiceError, type AIClient } from "../aiClient";
import { requireAuth } from "../middleware/auth";
import type { RagAnswerResponse } from "../types";

const messageSchema = z.object({ content: z.string().min(1).max(4000) });

export function chatRouter(db: DB, ai: AIClient): Router {
  const router = Router();
  router.use("/chat/sessions", requireAuth);

  router.post("/chat/sessions", async (req, res, next) => {
    try {
      const body = z.object({ title: z.string().max(200).optional() }).parse(req.body ?? {});
      const title = body.title ?? "New chat";
      const result = await db.query(
        "INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id, user_id, title, created_at",
        [req.user!.id, title],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.get("/chat/sessions", async (req, res, next) => {
    try {
      const result = await db.query(
        "SELECT id, title, created_at FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user!.id],
      );
      res.json({ items: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.get("/chat/sessions/:id", async (req, res, next) => {
    try {
      const session = await db.query("SELECT id, title, created_at FROM chat_sessions WHERE id = $1 AND user_id = $2", [
        req.params.id,
        req.user!.id,
      ]);
      if (!session.rows[0]) {
        res.status(404).json({ error: { message: "Session not found" } });
        return;
      }
      const messages = await db.query(
        "SELECT id, role, content, citations, grounded, created_at FROM chat_messages " +
          "WHERE session_id = $1 ORDER BY created_at ASC",
        [req.params.id],
      );
      res.json({ session: session.rows[0], messages: messages.rows });
    } catch (err) {
      next(err);
    }
  });

  router.post("/chat/sessions/:id/messages", async (req, res, next) => {
    try {
      const body = messageSchema.parse(req.body);
      const session = await db.query("SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2", [
        req.params.id,
        req.user!.id,
      ]);
      if (!session.rows[0]) {
        res.status(404).json({ error: { message: "Session not found" } });
        return;
      }

      const history = await db.query(
        "SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10",
        [req.params.id],
      );

      const rag = await ai.post<RagAnswerResponse>("/rag/answer", {
        query: body.content,
        history: history.rows.reverse(),
      });

      await db.query("INSERT INTO chat_messages (session_id, role, content) VALUES ($1, 'user', $2)", [
        req.params.id,
        body.content,
      ]);
      const assistant = await db.query(
        "INSERT INTO chat_messages (session_id, role, content, citations, grounded) " +
          "VALUES ($1, 'assistant', $2, $3::jsonb, $4) RETURNING id, role, content, citations, grounded, created_at",
        [req.params.id, rag.answer, JSON.stringify(rag.citations ?? []), rag.grounded ?? true],
      );
      res.status(201).json(assistant.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
