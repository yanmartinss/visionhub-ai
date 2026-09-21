import { Worker } from "bullmq";
import { prisma } from "./lib/prisma.ts";
import { createWorkerConnection } from "./queue/connection.ts";
import {
  closeSegmentQueue,
  SEGMENT_QUEUE_NAME,
  type SegmentJobData,
} from "./queue/segment-queue.ts";
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

console.log(
  `[worker] Listening on "${SEGMENT_QUEUE_NAME}" (concurrency ${concurrency})`,
);

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} received, shutting down...`);
  clearInterval(recoveryTimer);
  await worker.close(); // waits for the running job to finish
  await connection.quit().catch(() => {});
  await closeSegmentQueue();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
