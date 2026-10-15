import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000;

// `ffmpeg-static` exports the binary path (null on unsupported platforms).
const ffmpegBinary = (): string => {
  // Under NodeNext the CJS default import is typed as the module namespace.
  const binary = ffmpegPath as unknown as string | null;
  if (!binary) throw new Error("ffmpeg binary not available on this platform");
  return binary;
};

const run = async (args: string[], outputPath: string) => {
  await execFileAsync(
    ffmpegBinary(),
    ["-hide_banner", "-loglevel", "error", "-y", ...args, outputPath],
    { timeout: FFMPEG_TIMEOUT_MS },
  );
  // ffmpeg exits 0 with no/empty file when `-ss` is past the end of the video.
  const { size } = await stat(outputPath);
  if (size === 0) throw new Error("ffmpeg produced an empty file");
  return size;
};

// Cuts [startSec, startSec + durationSec) re-encoded small: H.264, high CRF,
// capped at 480p and without audio (audio could capture conversations; LGPD).
// `-ss` before `-i` seeks without decoding, so long originals stay cheap.
export const cutClip = (
  inputPath: string,
  outputPath: string,
  startSec: number,
  durationSec: number,
) =>
  run(
    [
      ...["-ss", startSec.toFixed(3), "-i", inputPath],
      ...["-t", durationSec.toFixed(3)],
      ...["-vf", "scale=-2:'min(480,ih)'"],
      ...["-c:v", "libx264", "-crf", process.env.CLIP_CRF || "30"],
      ...["-preset", "veryfast", "-pix_fmt", "yuv420p", "-an"],
      ...["-movflags", "+faststart"],
    ],
    outputPath,
  );

export const grabThumbnail = (
  inputPath: string,
  outputPath: string,
  atSec: number,
) =>
  run(
    [
      ...["-ss", atSec.toFixed(3), "-i", inputPath],
      ...["-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "4"],
    ],
    outputPath,
  );
