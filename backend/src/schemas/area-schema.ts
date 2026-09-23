import z from "zod";
import { AREA_TYPES } from "../lib/event-types.ts";

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const polygonSchema = z.array(pointSchema).min(3).max(20);

export const createAreaSchema = z.object({
  type: z.enum(AREA_TYPES),
  polygon: polygonSchema,
});

export const updateAreaSchema = z
  .object({
    type: z.enum(AREA_TYPES).optional(),
    polygon: polygonSchema.optional(),
  })
  .refine((value) => value.type !== undefined || value.polygon !== undefined, {
    message: "Nothing to update",
  });
