import { AppError } from "../lib/app-error.ts";
import { prisma } from "../lib/prisma.ts";
import type { RuleInput } from "../schemas/create-rule-schema.ts";
import { findCameraById } from "./camera.service.ts";

export const addRule = async (data: RuleInput) => {
  const findCamera = await findCameraById(data.cameraId);
  if (!findCamera) throw new AppError(404, "Camera not found");
  const rule = await prisma.rule.create({
    data: {
      cameraId: data.cameraId,
      eventType: data.eventType,
      timeLimitSeconds: data.timeLimitSeconds,
    },
    select: {
      id: true,
      cameraId: true,
      eventType: true,
      timeLimitSeconds: true,
    },
  });
  return rule;
};
