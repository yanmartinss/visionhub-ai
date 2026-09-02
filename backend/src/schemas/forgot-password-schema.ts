import z from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export type EmailInput = z.infer<typeof forgotPasswordSchema>;
