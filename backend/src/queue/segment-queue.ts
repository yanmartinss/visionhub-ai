import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { createQueueConnection } from "./connection.ts";

export const SEGMENT_QUEUE_NAME = "segment-processing";

export type SegmentJobData = { segmentId: string };

const ENQUEUE_TIMEOUT_MS = 2_000;

const maxAttempts = () => Number(process.env.SEGMENT_MAX_ATTEMPTS) || 3;
const retryBackoffMs = () =>
  Number(process.env.SEGMENT_RETRY_BACKOFF_MS) || 30_000;

let queue: Queue<SegmentJobData> | null = null;
let connection: Redis | null = null;

// Created on first use so the API boots even when Redis is not running.
const getSegmentQueue = () => {
  if (!queue) {
    connection = createQueueConnection();
    queue = new Queue<SegmentJobData>(SEGMENT_QUEUE_NAME, { connection });
    queue.on("error", (err) =>
      console.error("[queue] Redis error:", err.message),
    );
  }
  return queue;
};

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for the queue")),
      ms,
    );
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });

// `jobId = segmentId` makes this idempotent: adding a segment whose job still
// exists (waiting, active or waiting to retry) is a no-op.
export const enqueueSegment = async (segmentId: string) => {
  await withTimeout(
    getSegmentQueue().add(
      "process-segment",
      { segmentId },
      {
        jobId: segmentId,
        attempts: maxAttempts(),
        backoff: { type: "exponential", delay: retryBackoffMs() },
        removeOnComplete: true,
        removeOnFail: true,
      },
    ),
    ENQUEUE_TIMEOUT_MS,
  );
};

// For request handlers: the segment is already saved, so a queue outage must
// not fail the request. The worker's recovery sweep enqueues it later.
export const tryEnqueueSegment = async (segmentId: string) => {
  try {
    await enqueueSegment(segmentId);
    return true;
  } catch (err) {
    console.error(
      `[queue] Could not enqueue segment ${segmentId}; recovery will retry:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
};

export const closeSegmentQueue = async () => {
  if (queue) await queue.close();
  if (connection) await connection.quit().catch(() => {});
  queue = null;
  connection = null;
};
