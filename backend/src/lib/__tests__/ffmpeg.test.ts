import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ffmpegPath from "ffmpeg-static";
// @ts-expect-error -- no bundled types.
import ffprobePath from "ffprobe-static";
import { cutClip, grabThumbnail } from "../ffmpeg.ts";
import { probeVideo } from "../probe-video.ts";
import { computeClipWindow } from "../../services/event-media.service.ts";

const binary = ffmpegPath as unknown as string;
const ffprobeBinary: string =
  typeof ffprobePath === "string" ? ffprobePath : ffprobePath.path;
let dir: string;
let source: string;

// Synthetic 30 s 1080p video: no real recording needed to validate cutting.
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "ffmpeg-test-"));
  source = path.join(dir, "source.mp4");
  execFileSync(binary, [
    ...["-hide_banner", "-loglevel", "error", "-y"],
    ...["-f", "lavfi", "-i", "testsrc=size=1920x1080:rate=10"],
    ...["-f", "lavfi", "-i", "sine=frequency=440"],
    ...["-t", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"],
    source,
  ]);
}, 120_000);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("cutClip", () => {
  it("cuts the requested window, shrunk and without audio", async () => {
    const out = path.join(dir, "clip.mp4");
    const size = await cutClip(source, out, 10, 8);
    expect(size).toBeGreaterThan(0);
    expect(statSync(out).size).toBe(size);

    const { durationSec } = await probeVideo(out);
    expect(durationSec).toBeGreaterThan(7.5);
    expect(durationSec).toBeLessThan(8.5);

    const probe = JSON.parse(
      execFileSync(
        ffprobeBinary,
        ["-v", "error", "-print_format", "json", "-show_streams", out],
        { encoding: "utf8" },
      ),
    );
    const types = probe.streams.map(
      (st: { codec_type: string }) => st.codec_type,
    );
    expect(types).toEqual(["video"]);
    expect(probe.streams[0].height).toBe(480);
  }, 120_000);
});

describe("grabThumbnail", () => {
  it("writes a jpeg", async () => {
    const out = path.join(dir, "thumb.jpg");
    const size = await grabThumbnail(source, out, 12);
    expect(size).toBeGreaterThan(1000);
  });

  it("rejects an offset past the end instead of writing an empty file", async () => {
    await expect(
      grabThumbnail(source, path.join(dir, "late.jpg"), 500),
    ).rejects.toThrow();
  });
});

describe("computeClipWindow", () => {
  it("adds 10 s of context on both sides", () => {
    expect(computeClipWindow(60, 30, 3600)).toEqual({
      start: 50,
      duration: 50,
    });
  });

  it("clamps to the start and end of the segment", () => {
    expect(computeClipWindow(3, 4, 12)).toEqual({ start: 0, duration: 12 });
  });

  it("caps long events", () => {
    const { duration } = computeClipWindow(100, 3000, 3600);
    expect(duration).toBe(120);
  });
});
