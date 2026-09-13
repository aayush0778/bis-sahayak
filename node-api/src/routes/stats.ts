import { Router } from "express";
import type { DB } from "../db";

/** Public corpus counts — powers the "what's in the corpus" strip in chat. */
export function statsRouter(db: DB): Router {
  const router = Router();
  router.get("/stats", async (_req, res, next) => {
    try {
      const result = await db.query(
        "SELECT (SELECT count(*) FROM standards) AS standards, " +
          "(SELECT count(*) FROM qco_notifications) AS qcos, " +
          "(SELECT count(*) FROM bis_offices) AS offices",
      );
      const row = result.rows[0];
      res.json({
        standards: Number(row.standards),
        qcos: Number(row.qcos),
        offices: Number(row.offices),
      });
    } catch (err) {
      next(err);
    }
  });
  return router;
}
