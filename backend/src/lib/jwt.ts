import jwt from "jsonwebtoken";
import { AppError } from "./app-error.ts";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET não definido no .env");

const EXPIRES_IN = "7d";

export type TokenPayload = { sub: string };

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret as string, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, secret as string);
    if (typeof decoded === "string" || !decoded.sub) {
      throw new AppError(401, "Token inválido");
    }
    return { sub: String(decoded.sub) };
  } catch {
    throw new AppError(401, "Sessão inválida ou expirada");
  }
}
