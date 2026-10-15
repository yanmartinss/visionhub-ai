import type { RequestHandler } from "express";
import { accuracyQuerySchema } from "../schemas/accuracy-query-schema.ts";
import * as statsService from "../services/stats.service.ts";

export const getAccuracy: RequestHandler = async (req, res, next) => {
  const result = accuracyQuerySchema.safeParse(req.query);
  if (!result.success)
    return res.status(400).json({ error: "Invalid filters" });

  try {
    return res.status(200).json(await statsService.getAccuracy(result.data));
  } catch (err) {
    next(err);
  }
};
