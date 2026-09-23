import { readFile } from "node:fs/promises";
import type { Detection, DetectorInput } from "../lib/detector.ts";

// Dev/demo stand-in for the Fatia G Python service. Reads detections from a
// JSON file sitting next to the segment's stored video
// (`storage/uploads/<segmentId>.json`, alongside `uploads/<segmentId><ext>`).
// No file → no detections → no events: safe default for real uploads without
// a matching fixture. See `backend/fixtures/example-detections.json` for the
// expected shape, and CLAUDE.md for how to use it in manual testing.
export const runSimulatedDetector = async ({
  segmentId,
  filePath,
}: DetectorInput): Promise<Detection[]> => {
  const fixturePath = `${filePath.slice(0, filePath.lastIndexOf("."))}.json`;
  // filePath's extension may be absent (e.g. link downloads without one); try
  // both the sibling-by-stripped-extension path and a plain `<segmentId>.json`.
  const candidates = [fixturePath, `${filePath}.json`].filter(
    (value, index, all) => all.indexOf(value) === index,
  );

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      return parsed as Detection[];
    } catch {
      // Try the next candidate, or fall through to "no detections".
    }
  }

  void segmentId;
  return [];
};
