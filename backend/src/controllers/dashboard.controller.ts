import type { RequestHandler } from "express";
import { dashboardQuerySchema } from "../schemas/dashboard-query-schema.ts";
import * as dashboardService from "../services/dashboard.service.ts";

export const getDashboard: RequestHandler = async (req, res, next) => {
  const result = dashboardQuerySchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ error: "Invalid date" });

  try {
    const dashboard = await dashboardService.getDashboard(result.data.date);
    return res.status(200).json(dashboard);
  } catch (err) {
    next(err);
  }
};
