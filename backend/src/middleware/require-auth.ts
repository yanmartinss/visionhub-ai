import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.ts";
import { AppError } from "../lib/app-error.ts";
import { verifyToken } from "../lib/jwt.ts";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) throw new AppError(401, "Não autenticado");

    const { sub } = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user || !user.active) {
      throw new AppError(401, "Sessão inválida");
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    next();
  } catch (err) {
    next(err);
  }
};
