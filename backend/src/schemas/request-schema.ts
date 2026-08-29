import z from "zod";

export const requestSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.email(),
  password: z.string().min(4),
});
