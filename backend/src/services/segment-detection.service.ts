import {
  EVENT_TYPE_REQUIREMENTS,
  type EventTypeValue,
} from "../lib/event-types.ts";
import type { Detection } from "../lib/detector.ts";
import { runDetector } from "../lib/detector.ts";
import { pointInPolygon, type Point } from "../lib/point-in-polygon.ts";
import { prisma } from "../lib/prisma.ts";

const gapToleranceSec = () =>
  Number(process.env.DETECTION_GAP_TOLERANCE_SEC) || 3;

type Candidate = {
  eventType: EventTypeValue;
  timeSec: number;
  confidence: number;
};

type IntervalDraft = {
  eventType: EventTypeValue;
  startSec: number;
  endSec: number;
  touchesStart: boolean;
  touchesEnd: boolean;
  maxConfidence: number;
};

// A detection matches an event type's requirement when its label matches and
// (if the type is area-scoped) its center point is inside/outside a matching
// area on the camera — resolved here, once, so later steps (finalization)
// never need `Area` or bounding boxes again.
export const resolveEventTypeCandidates = (
  detection: Detection,
  areas: { type: string; polygon: unknown }[],
): Candidate[] => {
  const center: Point = {
    x: detection.box.x + detection.box.width / 2,
    y: detection.box.y + detection.box.height / 2,
  };

  const candidates: Candidate[] = [];
  for (const [eventType, req] of Object.entries(EVENT_TYPE_REQUIREMENTS) as [
    EventTypeValue,
    (typeof EVENT_TYPE_REQUIREMENTS)[EventTypeValue],
  ][]) {
    if (req.detectionLabel === null || req.detectionLabel !== detection.label)
      continue;

    if (req.containment === null) {
      candidates.push({
        eventType,
        timeSec: detection.timeSec,
        confidence: detection.confidence,
      });
      continue;
    }

    const matchingAreas = areas.filter((area) => area.type === req.areaType);
    const inside = matchingAreas.some((area) =>
      pointInPolygon(center, area.polygon as Point[]),
    );
    const matches = req.containment === "inside" ? inside : !inside;
    if (matches) {
      candidates.push({
        eventType,
        timeSec: detection.timeSec,
        confidence: detection.confidence,
      });
    }
  }
  return candidates;
};

// Groups candidates by event type, sorts by time and merges consecutive ones
// (within `toleranceSec`) into intervals — the "state changed" signal a real
// tracker would also produce, just coarser (frame-sampling-rate coarse).
export const mergeIntervals = (
  candidates: Candidate[],
  durationSec: number | null,
  toleranceSec = gapToleranceSec(),
): IntervalDraft[] => {
  const byType = new Map<EventTypeValue, Candidate[]>();
  for (const candidate of candidates) {
    const list = byType.get(candidate.eventType) ?? [];
    list.push(candidate);
    byType.set(candidate.eventType, list);
  }

  const drafts: IntervalDraft[] = [];
  for (const [eventType, list] of byType) {
    const sorted = [...list].sort((a, b) => a.timeSec - b.timeSec);
    let start = sorted[0]!.timeSec;
    let end = sorted[0]!.timeSec;
    let maxConfidence = sorted[0]!.confidence;

    const flush = () => {
      drafts.push({
        eventType,
        startSec: start,
        endSec: end,
        touchesStart: start <= toleranceSec,
        touchesEnd: durationSec !== null && end >= durationSec - toleranceSec,
        maxConfidence,
      });
    };

    for (let i = 1; i < sorted.length; i++) {
      const point = sorted[i]!;
      if (point.timeSec - end <= toleranceSec) {
        end = point.timeSec;
        maxConfidence = Math.max(maxConfidence, point.confidence);
      } else {
        flush();
        start = point.timeSec;
        end = point.timeSec;
        maxConfidence = point.confidence;
      }
    }
    flush();
  }
  return drafts;
};

// Passo A: runs the detector for a segment, resolves each detection into
// event-type candidates against the camera's current areas, merges them into
// intervals, and replaces this segment's stored intervals (idempotent — safe
// to call again when the segment is reprocessed).
export const detectSegment = async (params: {
  segmentId: string;
  filePath: string;
  cameraId: string;
  durationSec: number | null;
}) => {
  const { segmentId, filePath, cameraId, durationSec } = params;

  const [detections, areas] = await Promise.all([
    runDetector({ segmentId, filePath }),
    prisma.area.findMany({
      where: { cameraId },
      select: { type: true, polygon: true },
    }),
  ]);

  const candidates = detections.flatMap((detection) =>
    resolveEventTypeCandidates(detection, areas),
  );
  const intervals = mergeIntervals(candidates, durationSec);

  await prisma.$transaction([
    prisma.detectionInterval.deleteMany({ where: { segmentId } }),
    ...(intervals.length > 0
      ? [
          prisma.detectionInterval.createMany({
            data: intervals.map((interval) => ({ segmentId, ...interval })),
          }),
        ]
      : []),
  ]);
};
