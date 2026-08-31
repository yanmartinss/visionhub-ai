import z from "zod";

export const requestSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.email(),
  condominium: z.string().trim().min(2).max(30),
  message: z.string().trim().max(250).optional(),
});

export type RequestInput = z.infer<typeof requestSchema>;
