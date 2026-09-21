import { prisma } from "../lib/prisma.ts";
import { enqueueSegment } from "../queue/segment-queue.ts";

const staleProcessingMs = () =>
  Number(process.env.STALE_PROCESSING_MS) || 30 * 60 * 1000;

// Safety net for jobs that never reached Redis (or were lost with it): enqueues
// every `received` segment and every `processing` one that stopped moving.
// Safe to run at any time, since `jobId = segmentId` deduplicates live jobs.
export const recoverSegments = async () => {
  const staleBefore = new Date(Date.now() - staleProcessingMs());

  const segments = await prisma.segment.findMany({
    where: {
      OR: [
        { status: "received" },
        { status: "processing", updatedAt: { lt: staleBefore } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  for (const segment of segments) {
    await enqueueSegment(segment.id);
  }
  return segments.length;
};
