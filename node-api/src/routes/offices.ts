import { Router } from "express";
import type { DB } from "../db";

export function officesRouter(db: DB): Router {
  const router = Router();

  // Public: BIS's physical footprint with per-row source URLs.
  router.get("/offices", async (req, res, next) => {
    try {
      const type = typeof req.query.type === "string" ? req.query.type.trim().toLowerCase() : "";
      const allowed = ["hq", "regional_office", "branch_office", "laboratory"];
      const params: unknown[] = [];
      let where = "";
      if (type && allowed.includes(type)) {
        params.push(type);
        where = "WHERE office_type = $1";
      }
      const rows = await db.query(
        `SELECT office_type, name, region, address, phone, email, latitude, longitude, source_url
         FROM bis_offices ${where}
         ORDER BY CASE office_type
             WHEN 'hq' THEN 0
             WHEN 'regional_office' THEN 1
             WHEN 'branch_office' THEN 2
             ELSE 3
           END, name`,
        params,
      );
      res.json({
        items: rows.rows,
        note: "Directory data transcribed from bis.gov.in; every row links its source. Rows without verified contacts carry the listing page as source.",
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
