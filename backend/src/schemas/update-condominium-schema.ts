import z from "zod";

export const updateCondominiumSchema = z.object({
  name: z.string("Nome do condomínio é obrigatório").trim().min(1).max(100),
  cep: z.string().trim().nullish(),
  street: z.string().trim().nullish(),
  neighborhood: z.string().trim().nullish(),
  number: z.string().trim().nullish(),
  city: z.string().trim().nullish(),
  state: z.string().trim().nullish(),
});

export type CondominiumData = z.infer<typeof updateCondominiumSchema>;
