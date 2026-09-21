import z from "zod";
import { recordingDateSchema } from "./create-recording-day-schema.ts";

export const listRecordingDaysSchema = z.object({
  cameraId: z.uuid().optional(),
  date: recordingDateSchema.optional(),
  status: z
    .enum(["pending", "processing", "completed", "partial", "failed"])
    .optional(),
});

export type ListRecordingDaysFilters = z.infer<typeof listRecordingDaysSchema>;
