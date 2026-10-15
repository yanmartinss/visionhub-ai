import path from "node:path";
import { z } from "zod";
import type { Detection, DetectorInput } from "../lib/detector.ts";
import { storageDir } from "../lib/storage.ts";

const DEFAULT_URL = "http://localhost:8000";
// CPU YOLO over a long segment (frames sampled every ~1.5 s) takes minutes.
const DEFAULT_TIMEOUT_MS = 30 * 60_000;

const visionUrl = () =>
  (process.env.VISION_URL || DEFAULT_URL).replace(/\/+$/, "");

const timeoutMs = () =>
  Number(process.env.VISION_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

const responseSchema = z.object({
  detections: z.array(
    z.object({
      label: z.string(),
      box: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      confidence: z.number().min(0).max(1),
      timeSec: z.number().min(0),
    }),
  ),
});

// Fatia G: calls the Python vision service (contract 3.1 in
// docs/agentes/README.md), one segment per request. Any failure throws, so the
// segment follows the normal retry/backoff flow in the worker.
export const runPythonDetector = async ({
  segmentId,
  filePath,
}: DetectorInput): Promise<Detection[]> => {
  // The service resolves `filePath` against its own mount of STORAGE_DIR.
  const relative = path
    .relative(storageDir(), path.resolve(filePath))
    .split(path.sep)
    .join("/");

  let response: Response;
  try {
    response = await fetch(`${visionUrl()}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segmentId, filePath: relative }),
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (error) {
    throw new Error("Vision service is unreachable or timed out", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new Error(`Vision service responded with HTTP ${response.status}`);
  }

  const parsed = responseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new Error("Vision service returned an unexpected response");
  }
  return parsed.data.detections;
};
