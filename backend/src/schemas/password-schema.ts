import z from "zod";

// bcrypt trunca em 72 bytes; limitar aqui evita surpresa silenciosa.
export const passwordSchema = z.object({
  newPassword: z.string().min(8).max(72),
});

export type PasswordInput = z.infer<typeof passwordSchema>;
