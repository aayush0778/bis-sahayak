import { Router } from "express";
import { z } from "zod";
import type { AIClient } from "../aiClient";
import { requireAuth } from "../middleware/auth";
import type { ApplicabilityResponse } from "../types";

const schema = z.object({
  productDescription: z.string().min(3).max(2000),
  category: z.string().max(200).optional(),
});

export function applicabilityRouter(ai: AIClient): Router {
  const router = Router();
  router.use("/applicability", requireAuth);

  router.post("/applicability/check", async (req, res, next) => {
    try {
      const body = schema.parse(req.body);
      const result = await ai.post<ApplicabilityResponse>("/rag/applicability", body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
