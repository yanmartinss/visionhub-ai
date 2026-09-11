import { prisma } from "../lib/prisma.ts";
import type { CondominiumData } from "../schemas/update-condominium-schema.ts";

export const ensureCondominium = async (name: string) => {
  const condominium = await prisma.condominium.findFirst({});

  if (!condominium) {
    return prisma.condominium.create({
      data: { name },
    });
  }

  return condominium;
};

export const getCondominium = async () => {
  return prisma.condominium.findFirst({
    select: {
      id: true,
      name: true,
      cep: true,
      street: true,
      neighborhood: true,
      number: true,
      city: true,
      state: true,
    },
  });
};

export const updateCondominium = async (data: CondominiumData) => {
  const condominium = await getCondominium();
  let updatedCondominium;
  if (!condominium) {
    updatedCondominium = await prisma.condominium.create({
      data: { ...data },
      select: {
        id: true,
        name: true,
        cep: true,
        street: true,
        neighborhood: true,
        number: true,
        city: true,
        state: true,
      },
    });
  } else {
    updatedCondominium = await prisma.condominium.update({
      where: { id: condominium.id },
      data: { ...data },
      select: {
        id: true,
        name: true,
        cep: true,
        street: true,
        neighborhood: true,
        number: true,
        city: true,
        state: true,
      },
    });
  }
  return updatedCondominium;
};
