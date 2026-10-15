import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteObjects = vi.fn();
const listObjectPages = vi.fn();
const findMany = vi.fn();
const updateMany = vi.fn();

vi.mock("../../lib/object-storage.ts", () => ({
  deleteObjects,
  listObjectPages,
}));
vi.mock("../../lib/prisma.ts", () => ({
  prisma: { event: { findMany, updateMany } },
}));

const { expireClips, sweepOrphans, clipRetentionDays } =
  await import("../retention.service.ts");

const NOW = new Date("2026-10-15T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CLIP_RETENTION_DAYS;
});

describe("clipRetentionDays", () => {
  it("defaults to 30, accepts 0 (off) and ignores garbage", () => {
    expect(clipRetentionDays()).toBe(30);
    process.env.CLIP_RETENTION_DAYS = "7";
    expect(clipRetentionDays()).toBe(7);
    process.env.CLIP_RETENTION_DAYS = "0";
    expect(clipRetentionDays()).toBe(0);
    process.env.CLIP_RETENTION_DAYS = "abc";
    expect(clipRetentionDays()).toBe(30);
  });
});

describe("expireClips", () => {
  it("deletes objects, then clears clipPath, using a 30 day cutoff", async () => {
    findMany
      .mockResolvedValueOnce([
        { id: "e1", clipPath: "events/e1/clip.mp4" },
        { id: "e2", clipPath: "events/e2/clip.mp4" },
      ])
      .mockResolvedValueOnce([]);

    const count = await expireClips(NOW);

    expect(count).toBe(2);
    const where = findMany.mock.calls[0]![0].where;
    expect(where.createdAt.lt).toEqual(new Date(NOW.getTime() - 30 * DAY));
    expect(deleteObjects).toHaveBeenCalledWith([
      "events/e1/clip.mp4",
      "events/e2/clip.mp4",
    ]);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["e1", "e2"] } },
      data: { clipPath: null },
    });
    // The thumbnail is never part of the update.
    expect(updateMany.mock.calls[0]![0].data).not.toHaveProperty(
      "thumbnailPath",
    );
  });

  it("does not touch the rows when the object delete fails", async () => {
    findMany.mockResolvedValueOnce([{ id: "e1", clipPath: "k" }]);
    deleteObjects.mockRejectedValueOnce(new Error("s3 down"));
    await expect(expireClips(NOW)).rejects.toThrow("s3 down");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("is a no-op when retention is disabled", async () => {
    process.env.CLIP_RETENTION_DAYS = "0";
    expect(await expireClips(NOW)).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("sweepOrphans", () => {
  const old = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
  const fresh = new Date(NOW.getTime() - 60 * 1000);

  it("removes unreferenced objects past the grace period only", async () => {
    listObjectPages.mockReturnValue(
      (async function* () {
        yield [
          { key: "events/a/clip.mp4", lastModified: old }, // referenced
          { key: "events/b/clip.mp4", lastModified: old }, // orphan
          { key: "events/c/clip.mp4", lastModified: fresh }, // too new
        ];
      })(),
    );
    findMany.mockResolvedValue([
      { clipPath: "events/a/clip.mp4", thumbnailPath: null },
    ]);

    const removed = await sweepOrphans(NOW);

    expect(removed).toBe(1);
    expect(deleteObjects).toHaveBeenCalledWith(["events/b/clip.mp4"]);
  });
});
