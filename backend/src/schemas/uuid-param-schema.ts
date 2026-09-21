import z from "zod";

export const uuidParamSchema = z.object({
  id: z.uuid(),
});
