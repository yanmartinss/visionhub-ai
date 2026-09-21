import z from "zod";
import { segmentStartedAtSchema } from "./segment-started-at-schema.ts";

export const attachLinkSegmentSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  startedAt: segmentStartedAtSchema,
});
