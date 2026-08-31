import type { RequestHandler, CookieOptions } from "express";
import { loginSchema } from "../schemas/login-schema.ts";
import * as authService from "../services/auth.service.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: SEVEN_DAYS_MS,
  path: "/",
};

export const login: RequestHandler = async (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  try {
    const { token, user } = await authService.login(
      result.data.email,
      result.data.password,
    );
    res.cookie("token", token, cookieOptions);
    return res.json(user);
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie("token", { ...cookieOptions, maxAge: undefined });
  return res.status(204).end();
};

export const me: RequestHandler = (req, res) => {
  return res.json(req.user);
};
