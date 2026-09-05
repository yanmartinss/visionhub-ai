import z from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  email: z.email("E-mail inválido"),
  role: z.enum(["manager", "employee"]),
});
