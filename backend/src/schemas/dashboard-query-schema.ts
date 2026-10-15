import z from "zod";
import { recordingDateSchema } from "./create-recording-day-schema.ts";

export const dashboardQuerySchema = z.object({
  date: recordingDateSchema.optional(),
});
