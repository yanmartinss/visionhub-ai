import type { RequestHandler } from "express";
import { AppError } from "../lib/app-error.ts";

/** Usar sempre depois de `requireAuth`. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "admin") {
    return next(new AppError(403, "Acesso restrito ao administrador"));
  }
  next();
};
