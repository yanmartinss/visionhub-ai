import { AppError } from "../lib/app-error.ts";
import type { EventTypeValue } from "../lib/event-types.ts";
import { prisma } from "../lib/prisma.ts";
import { findCameraById } from "./camera.service.ts";
import { finalizeRecordingDay } from "./recording-day-finalization.service.ts";

const ruleSelect = {
  id: true,
  cameraId: true,
  eventType: true,
  timeLimitSeconds: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const listRulesByCamera = async (cameraId: string) => {
  const camera = await findCameraById(cameraId);
  if (!camera) throw new AppError(404, "Camera not found");

  return await prisma.rule.findMany({
    where: { cameraId },
    select: ruleSelect,
    orderBy: { eventType: "asc" },
  });
};

// Create-or-update: one rule per (camera, eventType), enforced by the unique
// index. Fields left out of `data` keep their current value on an update.
export const upsertRule = async (
  cameraId: string,
  eventType: EventTypeValue,
  data: { timeLimitSeconds?: number; active?: boolean },
) => {
  const camera = await findCameraById(cameraId);
  if (!camera) throw new AppError(404, "Camera not found");

  const rule = await prisma.rule.upsert({
    where: { cameraId_eventType: { cameraId, eventType } },
    create: {
      cameraId,
      eventType,
      timeLimitSeconds: data.timeLimitSeconds,
      active: data.active ?? true,
    },
    update: {
      timeLimitSeconds: data.timeLimitSeconds,
      active: data.active,
    },
    select: ruleSelect,
  });

  // A rule edit doesn't require reprocessing video (detection intervals are
  // already stored) — just re-run the finalization pass for this camera's
  // recent finished batches so the new time limit/active flag takes effect.
  // Inline (no queue): DB + JS only. Capped defensively for cameras with a
  // long history.
  const affectedDays = await prisma.recordingDay.findMany({
    where: { cameraId, status: { in: ["completed", "partial"] } },
    select: { id: true },
    orderBy: { date: "desc" },
    take: 20,
  });
  for (const day of affectedDays) {
    await finalizeRecordingDay(day.id);
  }

  return rule;
};
