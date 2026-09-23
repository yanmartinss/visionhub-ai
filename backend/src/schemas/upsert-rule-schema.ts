import z from "zod";
import {
  EVENT_TYPE_REQUIREMENTS,
  type EventTypeValue,
} from "../lib/event-types.ts";

const body = z.object({
  timeLimitSeconds: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

// The `timeLimitSeconds` requirement depends on the event type, which comes
// from the URL (`:eventType`), so the schema is built per request.
export const createUpsertRuleSchema = (eventType: EventTypeValue) =>
  body.refine(
    (value) => {
      const requiresTimeLimit =
        EVENT_TYPE_REQUIREMENTS[eventType].requiresTimeLimit;
      return requiresTimeLimit
        ? value.timeLimitSeconds !== undefined
        : value.timeLimitSeconds === undefined;
    },
    {
      message: EVENT_TYPE_REQUIREMENTS[eventType].requiresTimeLimit
        ? "Time limit is required for this event type"
        : "This event type must not have a time limit",
    },
  );
