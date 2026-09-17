import z from "zod";

export const createRuleSchema = z
  .object({
    cameraId: z.string(),
    eventType: z.enum([
      "gateOpen",
      "occupancy",
      "restrictedArea",
      "abandonedObject",
      "other",
    ]),
    timeLimitSeconds: z.number().optional(),
  })
  .refine(
    (value) => {
      if (value.eventType === "gateOpen" || value.eventType === "occupancy") {
        return (
          value.timeLimitSeconds !== undefined && value.timeLimitSeconds > 0
        );
      } else {
        return value.timeLimitSeconds === undefined;
      }
    },
    {
      message: "Time limit is required for gateOpen and occupancy events",
    },
  );

export type RuleInput = z.infer<typeof createRuleSchema>;
