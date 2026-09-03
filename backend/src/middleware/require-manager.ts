import type { RequestHandler } from "express";
import { AppError } from "../lib/app-error.ts";

export const requireManager: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "manager" && req.user?.role !== "admin") {
    return next(new AppError(403, "Acesso restrito aos gestores"));
  }
  next();
};
