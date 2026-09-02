import type { RequestHandler, CookieOptions } from "express";
import { loginSchema } from "../schemas/login-schema.ts";
import * as authService from "../services/auth.service.ts";
import { forgotPasswordSchema } from "../schemas/forgot-password-schema.ts";
import { resetPasswordSchema } from "../schemas/reset-password-schema.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
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
      result.data.maintainSession,
    );

    res.cookie("token", token, {
      ...cookieOptions,
      maxAge: result.data.maintainSession ? SEVEN_DAYS_MS : undefined,
    });
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

export const forgotPassword: RequestHandler = async (req, res) => {
  const result = forgotPasswordSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Dados inválidos" });

  await authService.forgotPassword(result.data.email);
  return res.status(204).end();
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: "Dados inválidos" });

  try {
    await authService.resetPassword(result.data.token, result.data.newPassword);
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};
