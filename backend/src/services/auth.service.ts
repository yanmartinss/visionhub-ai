import { compare } from "bcryptjs";
import { prisma } from "../lib/prisma.ts";
import { AppError } from "../lib/app-error.ts";
import { signToken } from "../lib/jwt.ts";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new AppError(401, "E-mail ou senha inválidos");

  const ok = await compare(password, user.passwordHash);
  if (!ok) throw new AppError(401, "E-mail ou senha inválidos");

  if (!user.active) throw new AppError(403, "Conta desativada");

  const token = signToken(user.id);

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
