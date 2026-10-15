import { Worker } from "bullmq";
import { prisma } from "./lib/prisma.ts";
import { createWorkerConnection } from "./queue/connection.ts";
import {
  closeSegmentQueue,
  SEGMENT_QUEUE_NAME,
  type SegmentJobData,
} from "./queue/segment-queue.ts";
import {
  closeMediaQueue,
  MEDIA_QUEUE_NAME,
  type MediaJobData,
} from "./queue/media-queue.ts";
import { generateDayMedia } from "./services/event-media.service.ts";
import { runRetention } from "./services/retention.service.ts";
import { processSegmentJob } from "./services/segment-processing.service.ts";
import { recoverSegments } from "./services/segment-recovery.service.ts";

const concurrency = Number(process.env.WORKER_CONCURRENCY) || 1;
const recoveryIntervalMs =
  Number(process.env.RECOVERY_INTERVAL_MS) || 5 * 60 * 1000;

const connection = createWorkerConnection();
const worker = new Worker<SegmentJobData>(
  SEGMENT_QUEUE_NAME,
  processSegmentJob,
  { connection, concurrency },
);

// FFmpeg cuts are CPU heavy: separate queue, one day at a time.
const mediaWorker = new Worker<MediaJobData>(
  MEDIA_QUEUE_NAME,
  async (job) => {
    const result = await generateDayMedia(job.data.recordingDayId);
    console.log(
      `[worker] Media for day ${job.data.recordingDayId}: ${result.generated} event(s), ${result.skipped} skipped, ${result.purged} original(s) removed`,
    );
  },
  { connection, concurrency: 1 },
);
mediaWorker.on("error", (err) =>
  console.error("[media-worker] error:", err.message),
);
mediaWorker.on("failed", (job, err) =>
  console.error(`[media-worker] day ${job?.data.recordingDayId}:`, err.message),
);

worker.on("error", (err) => console.error("[worker] error:", err.message));
worker.on("completed", (job) =>
  console.log(`[worker] Segment ${job.data.segmentId} done`),
);

const runRecovery = async () => {
  try {
    const count = await recoverSegments();
    if (count > 0)
      console.log(`[worker] Recovery enqueued ${count} segment(s)`);
  } catch (err) {
    console.error(
      "[worker] Recovery failed:",
      err instanceof Error ? err.message : err,
    );
  }
};

void runRecovery();
const recoveryTimer = setInterval(runRecovery, recoveryIntervalMs);

const retentionIntervalMs =
  Number(process.env.RETENTION_INTERVAL_MS) || 6 * 60 * 60 * 1000;
const runRetentionSafely = async () => {
  try {
    const result = await runRetention();
    if (result.expiredClips > 0 || result.orphans > 0)
      console.log(
        `[worker] Retention: ${result.expiredClips} clip(s) expired, ${result.orphans} orphan object(s) removed`,
      );
  } catch (err) {
    console.error(
      "[worker] Retention failed:",
      err instanceof Error ? err.message : err,
    );
  }
};
void runRetentionSafely();
const retentionTimer = setInterval(runRetentionSafely, retentionIntervalMs);

console.log(
  `[worker] Listening on "${SEGMENT_QUEUE_NAME}" (concurrency ${concurrency})`,
);

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} received, shutting down...`);
  clearInterval(recoveryTimer);
  clearInterval(retentionTimer);
  await worker.close(); // waits for the running job to finish
  await mediaWorker.close();
  await closeMediaQueue();
  await connection.quit().catch(() => {});
  await closeSegmentQueue();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
