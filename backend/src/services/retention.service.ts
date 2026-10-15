import { deleteObjects, listObjectPages } from "../lib/object-storage.ts";
import { prisma } from "../lib/prisma.ts";

const DEFAULT_CLIP_RETENTION_DAYS = 30;
const BATCH = 200;
// An object is uploaded before its key is written to the event row; the grace
// period keeps the orphan sweep from deleting a clip that is about to be linked.
const ORPHAN_GRACE_MS = 60 * 60 * 1000;
const MEDIA_PREFIX = "events/";

// `CLIP_RETENTION_DAYS=0` turns retention off (keep clips forever).
export const clipRetentionDays = () => {
  const raw = process.env.CLIP_RETENTION_DAYS;
  if (raw === undefined || raw === "") return DEFAULT_CLIP_RETENTION_DAYS;
  const days = Number(raw);
  return Number.isFinite(days) && days >= 0
    ? days
    : DEFAULT_CLIP_RETENTION_DAYS;
};

// Clips older than the retention period are deleted from the bucket and
// `clipPath` is cleared. The event and its thumbnail stay (RF17). Age is
// counted from when the clip was generated (`createdAt` of the event row is
// the closest we have), not from when the event happened: a recording sent
// late must not have its clip expire on arrival.
// Object first, row second: if the delete fails nothing changed and the next
// run retries; if the row update fails the key is just deleted twice.
export const expireClips = async (now = new Date()) => {
  const days = clipRetentionDays();
  if (days === 0) return 0;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let expired = 0;
  for (;;) {
    const events = await prisma.event.findMany({
      where: { clipPath: { not: null }, createdAt: { lt: cutoff } },
      select: { id: true, clipPath: true },
      take: BATCH,
    });
    if (events.length === 0) return expired;

    await deleteObjects(events.map((e) => e.clipPath!));
    await prisma.event.updateMany({
      where: { id: { in: events.map((e) => e.id) } },
      data: { clipPath: null },
    });
    expired += events.length;
  }
};

// Objects no event points to: left behind when finalization deletes a stale
// event, when a clip is regenerated, or when a row update failed after upload.
export const sweepOrphans = async (now = new Date()) => {
  const graceCutoff = now.getTime() - ORPHAN_GRACE_MS;
  let removed = 0;

  for await (const page of listObjectPages(MEDIA_PREFIX)) {
    const old = page.filter((o) => o.lastModified.getTime() < graceCutoff);
    if (old.length === 0) continue;

    const keys = old.map((o) => o.key);
    const referenced = await prisma.event.findMany({
      where: {
        OR: [{ clipPath: { in: keys } }, { thumbnailPath: { in: keys } }],
      },
      select: { clipPath: true, thumbnailPath: true },
    });
    const live = new Set<string>();
    for (const e of referenced) {
      if (e.clipPath) live.add(e.clipPath);
      if (e.thumbnailPath) live.add(e.thumbnailPath);
    }

    const orphans = keys.filter((key) => !live.has(key));
    if (orphans.length > 0) {
      await deleteObjects(orphans);
      removed += orphans.length;
    }
  }
  return removed;
};

export const runRetention = async (now = new Date()) => {
  const expiredClips = await expireClips(now);
  const orphans = await sweepOrphans(now);
  return { expiredClips, orphans };
};
