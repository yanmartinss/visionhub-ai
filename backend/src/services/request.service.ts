import { prisma } from "../lib/prisma.ts";
import { AppError } from "../lib/app-error.ts";
import type { RequestInput } from "../schemas/request-schema.ts";
import { createUser } from "./user.service.ts";
import { createUserSchema } from "../schemas/create-user-schema.ts";
import { ensureCondominium } from "./condominium.service.ts";

const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

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

export async function approveRequest(id: string) {
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) throw new AppError(404, "Solicitação não encontrada");
  if (request.status !== "pending") {
    throw new AppError(409, `Solicitação já está como "${request.status}"`);
  }

  const { emailDelivered } = await createUser(
    request.name,
    request.email,
    "manager",
    true,
  );

  await ensureCondominium(request.condominium);

  const updated = await prisma.request.update({
    where: { id },
    data: { status: "approved" },
    select: { id: true, status: true },
  });

  return { ...updated, emailDelivered };
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
