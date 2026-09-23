import { randomUUID } from "node:crypto";
import { rename } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../lib/app-error.ts";
import { isUniqueViolation } from "../lib/is-unique-violation.ts";
import { prisma } from "../lib/prisma.ts";
import type { ReceivedUpload } from "../lib/receive-upload.ts";
import { removeFile, storageDir, uploadsDir } from "../lib/storage.ts";
import { validateLinkUrl } from "../lib/validate-link-url.ts";
import { tryEnqueueSegment } from "../queue/segment-queue.ts";
import {
  assertRecordingDayExists,
  refreshRecordingDayStatus,
  segmentSelect,
} from "./recording-day.service.ts";

export const attachLinkSegment = async (
  recordingDayId: string,
  rawUrl: string,
  startedAt: Date,
) => {
  await assertRecordingDayExists(recordingDayId);
  const sourceRef = validateLinkUrl(rawUrl).toString();

  const existing = await prisma.segment.findFirst({
    where: { recordingDayId, sourceType: "link", sourceRef },
    select: segmentSelect,
  });
  if (existing) return { segment: existing, created: false };

  const segment = await prisma.segment.create({
    data: { recordingDayId, sourceType: "link", sourceRef, startedAt },
    select: segmentSelect,
  });
  await refreshRecordingDayStatus(recordingDayId);
  await tryEnqueueSegment(segment.id);

  return { segment, created: true };
};

export const attachUploadedSegment = async (
  recordingDayId: string,
  upload: ReceivedUpload,
  startedAt: Date,
) => {
  const findByHash = () =>
    prisma.segment.findUnique({
      where: {
        recordingDayId_fileHash: { recordingDayId, fileHash: upload.hash },
      },
      select: segmentSelect,
    });

  const segmentId = randomUUID();
  const fileName = `${segmentId}${upload.extension}`;
  const finalPath = path.join(uploadsDir(), fileName);
  let moved = false;

  try {
    await assertRecordingDayExists(recordingDayId);

    const existing = await findByHash();
    if (existing) {
      await removeFile(upload.tmpPath);
      return { segment: existing, created: false };
    }

    await rename(upload.tmpPath, finalPath);
    moved = true;

    const segment = await prisma.segment.create({
      data: {
        id: segmentId,
        recordingDayId,
        sourceType: "upload",
        sourceRef: upload.originalName,
        // Relative to STORAGE_DIR so the storage root can move.
        storagePath: path
          .relative(storageDir(), finalPath)
          .split(path.sep)
          .join("/"),
        fileHash: upload.hash,
        startedAt,
      },
      select: segmentSelect,
    });
    await refreshRecordingDayStatus(recordingDayId);
    await tryEnqueueSegment(segment.id);

    return { segment, created: true };
  } catch (err) {
    await removeFile(upload.tmpPath);
    if (moved) await removeFile(finalPath);

    // The same file arrived twice at once: return the segment that won.
    if (isUniqueViolation(err)) {
      const existing = await findByHash();
      if (existing) return { segment: existing, created: false };
    }
    throw err;
  }
};

export const reprocessSegment = async (segmentId: string) => {
  // `completed` is accepted too (not just `failed`): re-running detection is
  // how an operator picks up a newly marked area, an edited fixture (dev/demo
  // detector), or otherwise wants a fresh pass without re-uploading the file.
  // `received`/`processing` are excluded — already queued or in flight.
  const updated = await prisma.segment.updateMany({
    where: { id: segmentId, status: { in: ["failed", "completed"] } },
    data: { status: "received", error: null },
  });

  if (updated.count === 0) {
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId },
      select: { id: true },
    });
    if (!segment) throw new AppError(404, "Segment not found");
    throw new AppError(
      409,
      "Only failed or completed segments can be reprocessed",
    );
  }

  const segment = await prisma.segment.findUniqueOrThrow({
    where: { id: segmentId },
    select: segmentSelect,
  });
  await refreshRecordingDayStatus(segment.recordingDayId);
  await tryEnqueueSegment(segment.id);

  return segment;
};
