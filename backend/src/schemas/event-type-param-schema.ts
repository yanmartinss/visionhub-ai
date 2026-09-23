import z from "zod";
import { EVENT_TYPES } from "../lib/event-types.ts";

export const eventTypeParamSchema = z.object({
  id: z.uuid(),
  eventType: z.enum(EVENT_TYPES),
});
