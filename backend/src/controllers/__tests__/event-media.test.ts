import { Readable, Writable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/app-error.ts";

const getEventMediaKey = vi.fn();
const recordClipAccess = vi.fn();
const getObjectStream = vi.fn();

vi.mock("../../services/event.service.ts", () => ({
  getEventMediaKey,
  recordClipAccess,
}));
vi.mock("../../lib/object-storage.ts", () => ({
  getObjectStream,
  isMissingObject: (err: unknown) =>
    err instanceof Error && err.name === "NoSuchKey",
}));

const { getEventClip } = await import("../event.controller.ts");

const ID = "5d2c4a52-0f0e-4b53-9a53-7f3d3c0c2c11";
const USER = "9b1c7a0e-1111-4222-8333-444455556666";

const makeRes = () => {
  const chunks: Buffer[] = [];
  const res = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.from(chunk));
      cb();
    },
  }) as Writable & Record<string, unknown>;
  const headers: Record<string, string> = {};
  res.status = vi.fn(() => res);
  res.setHeader = vi.fn((k: string, v: string) => {
    headers[k] = v;
  });
  res.json = vi.fn(() => res);
  return { res, headers, chunks };
};

const run = async (id: string) => {
  const { res, headers, chunks } = makeRes();
  const next = vi.fn();
  await getEventClip(
    { params: { id }, user: { id: USER } } as never,
    res as never,
    next,
  );
  await new Promise((r) => setImmediate(r));
  return { res, headers, chunks, next };
};

beforeEach(() => {
  vi.clearAllMocks();
  recordClipAccess.mockResolvedValue(undefined);
});

describe("GET /events/:id/clip", () => {
  it("rejects a malformed id with 400", async () => {
    const { res } = await run("nope");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(getEventMediaKey).not.toHaveBeenCalled();
  });

  it("streams the object with private headers", async () => {
    getEventMediaKey.mockResolvedValue("events/x/clip.mp4");
    getObjectStream.mockResolvedValue({
      stream: Readable.from([Buffer.from("video-bytes")]),
      contentType: "video/mp4",
      contentLength: 11,
    });
    const { headers, chunks } = await run(ID);
    expect(headers["Content-Type"]).toBe("video/mp4");
    expect(headers["Cache-Control"]).toBe("private, no-store");
    expect(Buffer.concat(chunks).toString()).toBe("video-bytes");
  });

  it("records who opened the clip", async () => {
    getEventMediaKey.mockResolvedValue("events/x/clip.mp4");
    getObjectStream.mockResolvedValue({
      stream: Readable.from([Buffer.from("v")]),
      contentType: "video/mp4",
      contentLength: 1,
    });
    await run(ID);
    expect(recordClipAccess).toHaveBeenCalledWith(USER, ID);
  });

  it("does not serve the clip when the audit row cannot be written", async () => {
    getEventMediaKey.mockResolvedValue("events/x/clip.mp4");
    recordClipAccess.mockRejectedValue(new Error("db down"));
    const { next } = await run(ID);
    expect(next).toHaveBeenCalled();
    expect(getObjectStream).not.toHaveBeenCalled();
  });

  it("forwards 404 when the event has no media", async () => {
    getEventMediaKey.mockRejectedValue(new AppError(404, "Media not found"));
    const { next } = await run(ID);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it("maps a missing object to 404", async () => {
    getEventMediaKey.mockResolvedValue("events/x/clip.mp4");
    const gone = Object.assign(new Error("gone"), { name: "NoSuchKey" });
    getObjectStream.mockRejectedValue(gone);
    const { next } = await run(ID);
    const err = next.mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(404);
  });
});
