import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.ts";
import { AppError } from "../lib/app-error.ts";
import { sendTempPassword } from "../lib/mailer.ts";
import type { RequestInput } from "../schemas/request-schema.ts";

const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias
const SALT_ROUNDS = 10;

export async function createRequest(data: RequestInput) {
  const last = await prisma.request.findFirst({
    where: { email: data.email },
    orderBy: { createdAt: "desc" },
  });

  if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) {
    throw new AppError(
      409,
      "Você já solicitou acesso recentemente. Tente novamente em alguns dias.",
    );
  }

  const created = await prisma.request.create({
    data: {
      name: data.name,
      email: data.email,
      condominium: data.condominium,
      message: data.message,
    },
    select: { id: true, status: true },
  });

  return created;
}

export async function listRequests() {
  return prisma.request.findMany({ orderBy: { createdAt: "desc" } });
}

function generateTempPassword() {
  return randomBytes(9).toString("base64url"); // ~12 chars
}

/**
 * Aprova uma solicitação: cria o User (employee, ativo, com senha temporária que
 * precisa ser trocada) e marca a Request como approved. Manda a senha por e-mail.
 */
export async function approveRequest(id: string) {
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) throw new AppError(404, "Solicitação não encontrada");
  if (request.status !== "pending") {
    throw new AppError(409, `Solicitação já está como "${request.status}"`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: request.email },
  });
  if (existingUser) {
    throw new AppError(409, "Já existe um usuário com esse e-mail");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, SALT_ROUNDS);

  const [, updated] = await prisma.$transaction([
    prisma.user.create({
      data: {
        name: request.name,
        email: request.email,
        passwordHash,
        role: "employee",
        active: true,
        mustChangePassword: true,
      },
    }),
    prisma.request.update({
      where: { id },
      data: { status: "approved" },
      select: { id: true, status: true },
    }),
  ]);

  const loginUrl = `${process.env.APP_URL ?? "http://localhost:5173"}/login`;
  const mail = await sendTempPassword(request.email, tempPassword, loginUrl);

  return { ...updated, emailDelivered: mail.delivered };
}

export async function rejectRequest(id: string) {
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) throw new AppError(404, "Solicitação não encontrada");

  return prisma.request.update({
    where: { id },
    data: { status: "rejected" },
    select: { id: true, status: true },
  });
}
