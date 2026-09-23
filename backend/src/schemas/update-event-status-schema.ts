import z from "zod";

export const updateEventStatusSchema = z.object({
  status: z.enum(["pending", "inProgress", "resolved"]),
});
