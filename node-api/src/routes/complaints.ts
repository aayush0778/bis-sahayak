import { Router } from "express";
import { z } from "zod";
import type { AIClient } from "../aiClient";
import type { DB } from "../db";
import { requireAuth } from "../middleware/auth";
import type { ComplaintDraftResponse } from "../types";

const createSchema = z.object({
  productDescription: z.string().min(3).max(2000),
  defectDescription: z.string().min(3).max(4000),
  relatedRecordNumber: z.string().max(100).optional(),
});

export function complaintsRouter(db: DB, ai: AIClient): Router {
  const router = Router();
  router.use("/complaints", requireAuth);

  router.post("/complaints", async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const rag = await ai.post<ComplaintDraftResponse>("/rag/complaint-draft", {
        productDescription: body.productDescription,
        defectDescription: body.defectDescription,
        relatedRecordNumber: body.relatedRecordNumber ?? null,
      });
      const result = await db.query(
        "INSERT INTO complaints (user_id, product_description, defect_description, related_record_number, draft, cpgrams_url) " +
          "VALUES ($1, $2, $3, $4, $5::jsonb, $6) RETURNING id, product_description, defect_description, " +
          "related_record_number, draft, cpgrams_url, status, created_at",
        [
          req.user!.id,
          body.productDescription,
          body.defectDescription,
          body.relatedRecordNumber ?? rag.draft.relatedRecordNumber ?? null,
          JSON.stringify(rag.draft),
          "https://pgportal.gov.in",
        ],
      );
      res.status(201).json({ complaint: result.rows[0], citations: rag.citations });
    } catch (err) {
      next(err);
    }
  });

  router.get("/complaints", async (req, res, next) => {
    try {
      const result = await db.query(
        "SELECT id, product_description, defect_description, related_record_number, draft, status, created_at " +
          "FROM complaints WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user!.id],
      );
      res.json({ items: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.patch("/complaints/:id/submit", async (req, res, next) => {
    try {
      const result = await db.query(
        "UPDATE complaints SET status = 'submitted' WHERE id = $1 AND user_id = $2 " +
          "RETURNING id, status",
        [req.params.id, req.user!.id],
      );
      if (!result.rows[0]) {
        res.status(404).json({ error: { message: "Complaint not found" } });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
