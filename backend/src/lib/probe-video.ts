import { execFile } from "node:child_process";
import { promisify } from "node:util";
// @ts-expect-error -- no bundled types; the package exports the binary path as default.
import ffprobePath from "ffprobe-static";

const execFileAsync = promisify(execFile);

export type ProbedVideo = {
  durationSec: number | null;
  creationTime: Date | null;
};

const PROBE_TIMEOUT_MS = 20_000;

// Resolves to the ffprobe binary path; the package's default export shape
// differs slightly between platforms (`string` vs `{ path }`).
const ffprobeBinary: string =
  typeof ffprobePath === "string" ? ffprobePath : ffprobePath.path;

// Reads duration and creation time from a video file's container metadata.
// Never throws: probing is best-effort and must not fail the segment.
export const probeVideo = async (filePath: string): Promise<ProbedVideo> => {
  try {
    const { stdout } = await execFileAsync(
      ffprobeBinary,
      ["-v", "error", "-print_format", "json", "-show_format", filePath],
      { timeout: PROBE_TIMEOUT_MS },
    );
    const parsed = JSON.parse(stdout);
    const durationRaw = Number(parsed?.format?.duration);
    const durationSec = Number.isFinite(durationRaw) ? durationRaw : null;

    const creationRaw = parsed?.format?.tags?.creation_time;
    const creationDate = creationRaw ? new Date(creationRaw) : null;
    const creationTime =
      creationDate && !Number.isNaN(creationDate.getTime())
        ? creationDate
        : null;

    return { durationSec, creationTime };
  } catch (err) {
    console.error(
      "[probe-video] ffprobe failed, continuing without duration:",
      err instanceof Error ? err.message : err,
    );
    return { durationSec: null, creationTime: null };
  }
};
