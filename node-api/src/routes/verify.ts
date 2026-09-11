import { Router } from "express";
import type { DB } from "../db";

const TYPE_MAP: Record<string, string> = {
  cml: "CM/L",
  huid: "HUID",
  crs: "CRS",
};

export function verifyRouter(db: DB): Router {
  const router = Router();

  router.get("/verify/:type/:number", async (req, res, next) => {
    try {
      const recordType = TYPE_MAP[(req.params.type || "").toLowerCase()];
      if (!recordType) {
        res.status(400).json({ error: { message: "type must be one of: cml, huid, crs" } });
        return;
      }
      const number = String(req.params.number || "").trim().toUpperCase();
      const result = await db.query(
        "SELECT record_type, record_number, holder_name, product_scope, status, valid_until::text AS valid_until " +
          "FROM verification_records WHERE record_type = $1 " +
          "AND (UPPER(record_number) = $2 OR REPLACE(UPPER(record_number), 'CM/L-', '') = $2)",
        [recordType, number],
      );
      const row = result.rows[0] as
        | {
            record_type: string;
            record_number: string;
            holder_name: string;
            product_scope: string;
            status: string;
            valid_until: string | null;
          }
        | undefined;
      if (!row) {
        res.status(404).json({
          error: { message: `No ${recordType} record found for this number in BIS Sahayak's sample dataset` },
        });
        return;
      }
      res.json({
        record: {
          type: row.record_type,
          number: row.record_number,
          holderName: row.holder_name,
          productScope: row.product_scope,
          status: row.status,
          validUntil: row.valid_until,
        },
        note: "Sample record styled on BIS Care lookup fields (live licence DB is access-gated; see project README).",
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
