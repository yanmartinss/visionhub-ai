import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { createQueueConnection } from "./connection.ts";

export const MEDIA_QUEUE_NAME = "event-media";

export type MediaJobData = { recordingDayId: string };

const ENQUEUE_TIMEOUT_MS = 2_000;

let queue: Queue<MediaJobData> | null = null;
let connection: Redis | null = null;

const getMediaQueue = () => {
  if (!queue) {
    connection = createQueueConnection();
    queue = new Queue<MediaJobData>(MEDIA_QUEUE_NAME, { connection });
    queue.on("error", (err) =>
      console.error("[media-queue] Redis error:", err.message),
    );
  }
  return queue;
};

// One job per day; `jobId` makes enqueueing while one is pending a no-op (the
// job re-reads the day's events when it runs, so it picks up newer ones).
// Best-effort: media is derived data and is regenerated on the next
// finalization, so a queue outage only logs.
export const tryEnqueueMedia = async (recordingDayId: string) => {
  try {
    await Promise.race([
      getMediaQueue().add(
        "generate-media",
        { recordingDayId },
        {
          jobId: `media-${recordingDayId}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      ),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timed out waiting for the queue")),
          ENQUEUE_TIMEOUT_MS,
        ),
      ),
    ]);
    return true;
  } catch (err) {
    console.error(
      `[media-queue] Could not enqueue media for day ${recordingDayId}:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
};

export const closeMediaQueue = async () => {
  if (queue) await queue.close();
  if (connection) await connection.quit().catch(() => {});
  queue = null;
  connection = null;
};
