import z from "zod";

export const createCameraSchema = z.object({
  name: z.string().trim().min(1),
  location: z.string().trim().min(1),
});
