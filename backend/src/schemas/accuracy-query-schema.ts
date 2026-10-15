import z from "zod";
import { recordingDateSchema } from "./create-recording-day-schema.ts";

// Same convention as `GET /events`: `from`/`to` are recording-day dates.
export const accuracyQuerySchema = z
  .object({
    from: recordingDateSchema.optional(),
    to: recordingDateSchema.optional(),
    cameraId: z.uuid().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "`from` must not be after `to`",
  });

export type AccuracyFilters = z.infer<typeof accuracyQuerySchema>;
