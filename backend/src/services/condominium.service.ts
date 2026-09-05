import { prisma } from "../lib/prisma.ts";

export const ensureCondominium = async (name: string) => {
  const condominium = await prisma.condominium.findFirst({});

  if (!condominium) {
    return prisma.condominium.create({
      data: { name },
    });
  }

  return condominium;
};
