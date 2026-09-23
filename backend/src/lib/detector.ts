export type Detection = {
  // Free-form label. Known labels are matched against
  // `EVENT_TYPE_REQUIREMENTS[...].detectionLabel` (lib/event-types.ts); an
  // unrecognized label is simply ignored, so new labels can be added without
  // breaking older detections.
  label: string;
  // Normalized [0,1] bounding box, top-left origin.
  box: { x: number; y: number; width: number; height: number };
  confidence: number; // 0..1
  timeSec: number; // offset inside the segment's video, seconds, >= 0
};

export type DetectorInput = { segmentId: string; filePath: string };
export type Detector = (input: DetectorInput) => Promise<Detection[]>;

// Dispatches to the configured detector implementation. `simulated` (default)
// reads a JSON fixture per segment; `python` is the Fatia G plug point.
export const runDetector: Detector = async (input) => {
  const mode = process.env.DETECTOR || "simulated";
  if (mode === "simulated") {
    const { runSimulatedDetector } =
      await import("../services/simulated-detector.service.ts");
    return runSimulatedDetector(input);
  }
  throw new Error(`Detector "${mode}" is not implemented yet`);
};
