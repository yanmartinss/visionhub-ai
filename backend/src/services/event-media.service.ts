import { mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import { cutClip, grabThumbnail } from "../lib/ffmpeg.ts";
import { ensureBucket, putFile } from "../lib/object-storage.ts";
import { prisma } from "../lib/prisma.ts";
import { ensureDir, removeFile, storageDir, tmpDir } from "../lib/storage.ts";

const CONTEXT_SEC = 10;
const DEFAULT_MAX_CLIP_SEC = 120;

const maxClipSec = () =>
  Number(process.env.CLIP_MAX_SEC) || DEFAULT_MAX_CLIP_SEC;

export const clipKey = (eventId: string) => `events/${eventId}/clip.mp4`;
export const thumbnailKey = (eventId: string) =>
  `events/${eventId}/thumbnail.jpg`;

let bucketReady: Promise<void> | null = null;
const ensureBucketOnce = () => {
  bucketReady ??= ensureBucket().catch((err) => {
    bucketReady = null;
    throw err;
  });
  return bucketReady;
};

const loadPending = (recordingDayId: string) =>
  prisma.event.findMany({
    where: {
      segment: { recordingDayId },
      OR: [{ clipPath: null }, { thumbnailPath: null }],
    },
    select: {
      id: true,
      segmentId: true,
      occurredAt: true,
      startedAt: true,
      endedAt: true,
      clipPath: true,
      thumbnailPath: true,
      segment: {
        select: { startedAt: true, durationSec: true, storagePath: true },
      },
    },
  });

type PendingEvent = Awaited<ReturnType<typeof loadPending>>[number];

const fileExists = (file: string) =>
  stat(file).then(
    (s) => s.isFile(),
    () => false,
  );

// Window = [start - 10s, end + 10s] inside the event's *first* segment (a
// fused event can span segments, but the clip stays in the one it started in),
// capped at CLIP_MAX_SEC so a long "gate open" does not become a long clip.
export const computeClipWindow = (
  offsetSec: number,
  eventDurationSec: number,
  segmentDurationSec: number | null,
) => {
  const start = Math.max(0, offsetSec - CONTEXT_SEC);
  let end = offsetSec + Math.max(0, eventDurationSec) + CONTEXT_SEC;
  end = Math.min(end, start + maxClipSec());
  if (segmentDurationSec !== null) end = Math.min(end, segmentDurationSec);
  return { start, duration: Math.max(1, end - start) };
};

const generateForEvent = async (event: PendingEvent, workDir: string) => {
  const segment = event.segment;
  if (!segment?.storagePath) return "skipped" as const;
  const source = path.join(storageDir(), segment.storagePath);
  if (!(await fileExists(source))) return "skipped" as const;

  const eventStart = event.occurredAt ?? event.startedAt;
  const offsetSec = Math.max(
    0,
    (eventStart.getTime() - segment.startedAt.getTime()) / 1000,
  );
  const durationSec = event.endedAt
    ? (event.endedAt.getTime() - eventStart.getTime()) / 1000
    : 0;

  const data: { clipPath?: string; thumbnailPath?: string } = {};

  if (!event.thumbnailPath) {
    const out = path.join(workDir, `${event.id}.jpg`);
    // Offset past the end (bad metadata): still produce a picture.
    const at =
      segment.durationSec !== null && offsetSec >= segment.durationSec
        ? Math.max(0, segment.durationSec - 1)
        : offsetSec;
    const size = await grabThumbnail(source, out, at);
    await putFile(thumbnailKey(event.id), out, "image/jpeg", size);
    data.thumbnailPath = thumbnailKey(event.id);
  }

  if (!event.clipPath) {
    const out = path.join(workDir, `${event.id}.mp4`);
    const window = computeClipWindow(
      offsetSec,
      durationSec,
      segment.durationSec,
    );
    const size = await cutClip(source, out, window.start, window.duration);
    await putFile(clipKey(event.id), out, "video/mp4", size);
    data.clipPath = clipKey(event.id);
  }

  await prisma.event.update({ where: { id: event.id }, data });
  return "done" as const;
};

// Retention (RF16): the original is deleted once the day is finalized and its
// events have their media. Only `completed` segments of a `completed`/`partial`
// day, and never a segment that still has an event waiting for its clip.
// `fileHash` stays (re-sending the same file is still recognized); for links
// `sourceRef` allows a new download when the segment is reprocessed.
// KEEP_ORIGINALS=true disables this (dev/demo: reprocess with fixtures).
const purgeOriginals = async (
  recordingDayId: string,
  blockedSegmentIds: Set<string>,
) => {
  if (process.env.KEEP_ORIGINALS === "true") return 0;

  const day = await prisma.recordingDay.findUnique({
    where: { id: recordingDayId },
    select: { status: true },
  });
  if (day?.status !== "completed" && day?.status !== "partial") return 0;

  const segments = await prisma.segment.findMany({
    where: {
      recordingDayId,
      status: "completed",
      storagePath: { not: null },
    },
    select: { id: true, storagePath: true },
  });

  let purged = 0;
  for (const segment of segments) {
    if (blockedSegmentIds.has(segment.id) || !segment.storagePath) continue;
    // Claim by clearing the path first: if the segment was reprocessed in the
    // meantime (status no longer completed) nothing is touched.
    const claimed = await prisma.segment.updateMany({
      where: { id: segment.id, status: "completed" },
      data: { storagePath: null },
    });
    if (claimed.count === 0) continue;
    await removeFile(path.join(storageDir(), segment.storagePath));
    purged++;
  }
  return purged;
};

// Generates the clip and thumbnail for every event of the day that lacks
// them, then re-checks once: a refinalization may have created events while
// this ran (its enqueue was a no-op because this job was still pending).
// A failing event is logged and the rest continue; the job throws at the end
// so BullMQ retries only the ones still missing (idempotent: done events
// already have their paths).
export const generateDayMedia = async (recordingDayId: string) => {
  await ensureBucketOnce();
  await ensureDir(tmpDir());
  const workDir = await mkdtemp(path.join(tmpDir(), "media-"));
  const errored = new Set<string>();
  const skipped = new Set<string>();
  let generated = 0;

  try {
    for (let pass = 0; pass < 2; pass++) {
      const pending = (await loadPending(recordingDayId)).filter(
        (event) => !errored.has(event.id) && !skipped.has(event.id),
      );
      if (pending.length === 0) break;

      for (const event of pending) {
        try {
          const result = await generateForEvent(event, workDir);
          if (result === "done") generated++;
          else skipped.add(event.id); // original gone: nothing to retry
        } catch (err) {
          errored.add(event.id);
          console.error(
            `[event-media] event ${event.id} failed:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }

  if (errored.size > 0) {
    throw new Error(`Media failed for ${errored.size} event(s)`);
  }

  // Segments whose events are still missing media (e.g. created by a
  // refinalization during this run) keep their original for the next job.
  const stillPending = await loadPending(recordingDayId);
  const blocked = new Set<string>();
  for (const event of stillPending) {
    if (event.segmentId && !skipped.has(event.id)) blocked.add(event.segmentId);
  }
  const purged = await purgeOriginals(recordingDayId, blocked);

  return { generated, skipped: skipped.size, purged };
};
