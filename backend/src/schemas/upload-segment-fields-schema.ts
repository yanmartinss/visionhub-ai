import z from "zod";
import { segmentStartedAtSchema } from "./segment-started-at-schema.ts";

export const uploadSegmentFieldsSchema = z.object({
  startedAt: segmentStartedAtSchema,
});
