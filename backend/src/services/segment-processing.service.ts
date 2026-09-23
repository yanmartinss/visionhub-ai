import { UnrecoverableError, type Job } from "bullmq";
import { rename } from "node:fs/promises";
import path from "node:path";
import type { Segment } from "../../generated/prisma/client.ts";
import { AppError } from "../lib/app-error.ts";
import { DownloadError, downloadFile } from "../lib/download-file.ts";
import { isUniqueViolation } from "../lib/is-unique-violation.ts";
import { prisma } from "../lib/prisma.ts";
import { removeFile, storageDir, uploadsDir } from "../lib/storage.ts";
import type { SegmentJobData } from "../queue/segment-queue.ts";
import { refreshRecordingDayStatus } from "./recording-day.service.ts";
import { processSegmentFile } from "./segment-processor.ts";

const toStoragePath = (absolutePath: string) =>
  path.relative(storageDir(), absolutePath).split(path.sep).join("/");

// `segments.error` is shown to every logged-in user, so only messages we wrote
// ourselves are stored; anything else becomes a generic text (details go to the log).
const safeErrorMessage = (err: unknown) =>
  err instanceof DownloadError ||
  err instanceof AppError ||
  err instanceof UnrecoverableError
    ? err.message
    : "Processing failed";

const markCompleted = async (segment: Segment, note: string | null = null) => {
  await prisma.segment.update({
    where: { id: segment.id },
    data: { status: "completed", error: note },
  });
  await refreshRecordingDayStatus(segment.recordingDayId);
};

// Downloads a link segment (once) and records where the file lives. Returns
// null when the same content already exists in the day: the segment is then
// completed without processing, so events are never duplicated.
const ensureLocalFile = async (segment: Segment) => {
  if (segment.storagePath) return segment.storagePath;
  if (segment.sourceType !== "link") {
    throw new UnrecoverableError("Segment has no stored file");
  }

  const downloaded = await downloadFile(segment.sourceRef);

  const duplicate = await prisma.segment.findFirst({
    where: {
      recordingDayId: segment.recordingDayId,
      fileHash: downloaded.hash,
      id: { not: segment.id },
    },
    select: { id: true },
  });
  if (duplicate) {
    await removeFile(downloaded.tmpPath);
    await markCompleted(
      segment,
      `Duplicate of segment ${duplicate.id}, skipped`,
    );
    return null;
  }

  const finalPath = path.join(uploadsDir(), segment.id);
  await rename(downloaded.tmpPath, finalPath);
  const storagePath = toStoragePath(finalPath);

  try {
    await prisma.segment.update({
      where: { id: segment.id },
      data: { storagePath, fileHash: downloaded.hash },
    });
  } catch (err) {
    await removeFile(finalPath);
    if (!isUniqueViolation(err)) throw err;
    // Another segment of the day got the same content between the check and the update.
    await markCompleted(segment, "Duplicate of another segment, skipped");
    return null;
  }
  return storagePath;
};

export const processSegmentJob = async (job: Job<SegmentJobData>) => {
  const { segmentId } = job.data;

  // Atomic claim. `processing` is accepted so a stalled job can be re-run.
  const claimed = await prisma.segment.updateMany({
    where: { id: segmentId, status: { in: ["received", "processing"] } },
    data: { status: "processing", attempts: { increment: 1 }, error: null },
  });
  if (claimed.count === 0) return; // deleted or already finished

  const segment = await prisma.segment.findUniqueOrThrow({
    where: { id: segmentId },
    include: { recordingDay: { select: { cameraId: true } } },
  });
  await refreshRecordingDayStatus(segment.recordingDayId);

  try {
    const storagePath = await ensureLocalFile(segment);
    if (!storagePath) return;

    await processSegmentFile({
      segmentId: segment.id,
      filePath: path.join(storageDir(), storagePath),
      startedAt: segment.startedAt,
      cameraId: segment.recordingDay.cameraId,
    });
    await markCompleted(segment);
  } catch (err) {
    const failure =
      err instanceof DownloadError && !err.retryable
        ? new UnrecoverableError(err.message)
        : err;

    const maxAttempts = job.opts.attempts ?? 1;
    const isFinal =
      failure instanceof UnrecoverableError ||
      job.attemptsMade + 1 >= maxAttempts;

    console.error(
      `[worker] Segment ${segmentId} failed (attempt ${job.attemptsMade + 1}/${maxAttempts}${isFinal ? ", final" : ""}):`,
      err instanceof Error ? err.message : err,
    );

    if (isFinal) {
      await prisma.segment.update({
        where: { id: segmentId },
        data: { status: "failed", error: safeErrorMessage(failure) },
      });
      await refreshRecordingDayStatus(segment.recordingDayId);
    }
    throw failure;
  }
};
