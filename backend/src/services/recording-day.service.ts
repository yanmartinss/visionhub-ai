import { AppError } from "../lib/app-error.ts";
import { computeDayStatus } from "../lib/compute-day-status.ts";
import { isUniqueViolation } from "../lib/is-unique-violation.ts";
import { prisma } from "../lib/prisma.ts";
import type { ListRecordingDaysFilters } from "../schemas/list-recording-days-schema.ts";
import type { SegmentStatus } from "../../generated/prisma/client.ts";
import { findCameraById } from "./camera.service.ts";

const recordingDaySelect = {
  id: true,
  cameraId: true,
  date: true,
  status: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  camera: { select: { id: true, name: true } },
} as const;

// `sourceRef` is left out on purpose: for links it is the URL, which may carry
// a share token that non-managers should not see.
export const segmentSelect = {
  id: true,
  recordingDayId: true,
  sourceType: true,
  fileHash: true,
  startedAt: true,
  durationSec: true,
  status: true,
  attempts: true,
  error: true,
  createdAt: true,
  updatedAt: true,
} as const;

const eventSelect = {
  id: true,
  cameraId: true,
  type: true,
  technicalDescription: true,
  startedAt: true,
  endedAt: true,
  segmentId: true,
  occurredAt: true,
  confidence: true,
  thumbnailPath: true,
  clipPath: true,
  createdAt: true,
} as const;

type Progress = { total: number } & Record<SegmentStatus, number>;

const emptyProgress = (): Progress => ({
  total: 0,
  received: 0,
  processing: 0,
  completed: 0,
  failed: 0,
});

export const findRecordingDayById = async (recordingDayId: string) => {
  return await prisma.recordingDay.findUnique({
    where: { id: recordingDayId },
    select: recordingDaySelect,
  });
};

export const assertRecordingDayExists = async (recordingDayId: string) => {
  const recordingDay = await findRecordingDayById(recordingDayId);
  if (!recordingDay) throw new AppError(404, "Recording day not found");
  return recordingDay;
};

export const getOrCreateRecordingDay = async (
  cameraId: string,
  date: Date,
  userId: string,
) => {
  const camera = await findCameraById(cameraId);
  if (!camera) throw new AppError(404, "Camera not found");

  const findExisting = () =>
    prisma.recordingDay.findUnique({
      where: { cameraId_date: { cameraId, date } },
      select: recordingDaySelect,
    });

  const existing = await findExisting();
  if (existing) return { recordingDay: existing, created: false };

  if (!camera.active) throw new AppError(409, "Camera is inactive");

  try {
    const recordingDay = await prisma.recordingDay.create({
      data: { cameraId, date, createdBy: userId },
      select: recordingDaySelect,
    });
    return { recordingDay, created: true };
  } catch (err) {
    // Two requests created the same day at once: return the winner's row.
    if (!isUniqueViolation(err)) throw err;
    const recordingDay = await findExisting();
    if (!recordingDay) throw err;
    return { recordingDay, created: false };
  }
};

export const listRecordingDays = async (filters: ListRecordingDaysFilters) => {
  const recordingDays = await prisma.recordingDay.findMany({
    where: {
      cameraId: filters.cameraId,
      date: filters.date,
      status: filters.status,
    },
    select: recordingDaySelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const counts = await prisma.segment.groupBy({
    by: ["recordingDayId", "status"],
    where: { recordingDayId: { in: recordingDays.map((day) => day.id) } },
    _count: { _all: true },
  });

  const progressByDay = new Map<string, Progress>();
  for (const row of counts) {
    const progress = progressByDay.get(row.recordingDayId) ?? emptyProgress();
    progress[row.status] = row._count._all;
    progress.total += row._count._all;
    progressByDay.set(row.recordingDayId, progress);
  }

  return recordingDays.map((day) => ({
    ...day,
    progress: progressByDay.get(day.id) ?? emptyProgress(),
  }));
};

export const getRecordingDay = async (recordingDayId: string) => {
  const recordingDay = await prisma.recordingDay.findUnique({
    where: { id: recordingDayId },
    select: {
      ...recordingDaySelect,
      segments: { select: segmentSelect, orderBy: { startedAt: "asc" } },
    },
  });
  if (!recordingDay) throw new AppError(404, "Recording day not found");

  const progress = emptyProgress();
  for (const segment of recordingDay.segments) {
    progress[segment.status] += 1;
    progress.total += 1;
  }

  return { ...recordingDay, progress };
};

export const listDayEvents = async (recordingDayId: string) => {
  await assertRecordingDayExists(recordingDayId);

  return await prisma.event.findMany({
    where: { segment: { recordingDayId } },
    select: eventSelect,
    orderBy: [{ occurredAt: "asc" }, { startedAt: "asc" }],
  });
};

// Recomputes the day's status from its segments. The Etapa 3 worker calls this
// after each segment finishes.
export const refreshRecordingDayStatus = async (recordingDayId: string) => {
  const segments = await prisma.segment.findMany({
    where: { recordingDayId },
    select: { status: true },
  });
  const status = computeDayStatus(segments.map((segment) => segment.status));

  await prisma.recordingDay.update({
    where: { id: recordingDayId },
    data: { status },
  });
  return status;
};
