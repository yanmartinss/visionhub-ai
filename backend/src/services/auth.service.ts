import { compare } from "bcryptjs";
import { prisma } from "../lib/prisma.ts";
import { AppError } from "../lib/app-error.ts";
import { signToken } from "../lib/jwt.ts";
import { generateRandomSequence } from "../lib/generate-random-sequence.ts";
import { createHash } from "crypto";
import { sendPasswordReset } from "../lib/mailer.ts";

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

export async function login(
  email: string,
  password: string,
  maintainSession: boolean,
) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new AppError(401, "E-mail ou senha inválidos");

  const ok = await compare(password, user.passwordHash);
  if (!ok) throw new AppError(401, "E-mail ou senha inválidos");

  if (!user.active) throw new AppError(403, "Conta desativada");

  const token = signToken(user.id, maintainSession);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = generateRandomSequence();
  const hashToken = createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(Date.now() + ONE_HOUR_IN_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: hashToken, resetTokenExpiresAt: expiresAt },
  });

  const loginReset = `${process.env.APP_URL ?? "http://localhost:5173"}/reset-password?token=${token}`;
  await sendPasswordReset(user.email, loginReset);
};

export const resetPassword = async (token: string, newPassword: string) => {};
