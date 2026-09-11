import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import { requireAuth } from "../middleware/auth";

export function watchesRouter(db: DB): Router {
  const router = Router();
  router.use("/watches", requireAuth);

  router.get("/watches", async (req, res, next) => {
    try {
      const result = await db.query(
        "SELECT id, product_category, created_at FROM watches WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user!.id],
      );
      res.json({ items: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.post("/watches", async (req, res, next) => {
    try {
      const body = z.object({ productCategory: z.string().min(2).max(200) }).parse(req.body);
      const result = await db.query(
        "INSERT INTO watches (user_id, product_category) VALUES ($1, $2) " +
          "ON CONFLICT (user_id, product_category) DO NOTHING RETURNING id, product_category, created_at",
        [req.user!.id, body.productCategory.trim()],
      );
      if (!result.rows[0]) {
        res.status(409).json({ error: { message: "You already watch this category" } });
        return;
      }
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/watches/:id", async (req, res, next) => {
    try {
      const result = await db.query("DELETE FROM watches WHERE id = $1 AND user_id = $2 RETURNING id", [
        req.params.id,
        req.user!.id,
      ]);
      if (!result.rows[0]) {
        res.status(404).json({ error: { message: "Watch not found" } });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
