import { Router } from "express";
import type { DB } from "../db";

export function qcoRouter(db: DB): Router {
  const router = Router();

  router.get("/qco/feed", async (req, res, next) => {
    try {
      const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
      const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
      const category = typeof req.query.category === "string" ? req.query.category.trim() : "";

      const params: unknown[] = [];
      let where = "";
      if (category) {
        params.push(`%${category.toLowerCase()}%`);
        where = `WHERE array_to_string(product_categories, ' ') ILIKE $1`;
      }

      const countResult = await db.query(`SELECT count(*)::int AS total FROM qco_notifications ${where}`, params);
      const total = (countResult.rows[0] as { total: number }).total;

      const items = await db.query(
        `SELECT id, title, product_categories, applicable_is_numbers, effective_date::text AS effective_date,
                issuing_authority, scheme, summary, source_url
         FROM qco_notifications ${where}
         ORDER BY effective_date DESC
         LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        params,
      );
      res.json({ items: items.rows, total, page, pageSize });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
