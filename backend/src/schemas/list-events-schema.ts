import z from "zod";
import { EVENT_TYPES } from "../lib/event-types.ts";
import { recordingDateSchema } from "./create-recording-day-schema.ts";

// `from`/`to` are recording-day dates (inclusive), not event timestamps: no
// timezone math, and the same "day" the recordings screen shows.
export const listEventsSchema = z
  .object({
    from: recordingDateSchema.optional(),
    to: recordingDateSchema.optional(),
    type: z.enum(EVENT_TYPES).optional(),
    cameraId: z.uuid().optional(),
    status: z.enum(["pending", "inProgress", "resolved", "falsePositive"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    { message: "`from` must not be after `to`" },
  );

export type ListEventsFilters = z.infer<typeof listEventsSchema>;
