export type CoverageSegment = {
  id: string;
  startedAt: Date;
  durationSec: number | null;
};

export type CoverageIssueType = "gap" | "overlap" | "unknown";

export type CoverageIssue = {
  type: CoverageIssueType;
  fromSegmentId: string;
  toSegmentId: string;
  seconds: number;
};

const toleranceSec = () => Number(process.env.SEGMENT_GAP_TOLERANCE_SEC) || 5;

// Whether `next` picks up right where `prev` left off (within tolerance).
// Used both to flag coverage issues and to decide whether an event can be
// fused across the two segments' boundary.
export const segmentsAreContiguous = (
  prev: CoverageSegment,
  next: CoverageSegment,
  tolerance = toleranceSec(),
): boolean => {
  if (prev.durationSec === null) return false;
  const prevEnd = prev.startedAt.getTime() + prev.durationSec * 1000;
  const gapSec = (next.startedAt.getTime() - prevEnd) / 1000;
  return Math.abs(gapSec) <= tolerance;
};

// Segments must already be sorted by `startedAt` ascending.
export const computeCoverage = (
  segments: CoverageSegment[],
  tolerance = toleranceSec(),
): { issues: CoverageIssue[] } => {
  const issues: CoverageIssue[] = [];

  for (let i = 0; i + 1 < segments.length; i++) {
    const prev = segments[i]!;
    const next = segments[i + 1]!;

    if (prev.durationSec === null) {
      issues.push({
        type: "unknown",
        fromSegmentId: prev.id,
        toSegmentId: next.id,
        seconds: 0,
      });
      continue;
    }

    const prevEnd = prev.startedAt.getTime() + prev.durationSec * 1000;
    const gapSec = (next.startedAt.getTime() - prevEnd) / 1000;
    if (gapSec > tolerance) {
      issues.push({
        type: "gap",
        fromSegmentId: prev.id,
        toSegmentId: next.id,
        seconds: gapSec,
      });
    } else if (gapSec < -tolerance) {
      issues.push({
        type: "overlap",
        fromSegmentId: prev.id,
        toSegmentId: next.id,
        seconds: -gapSec,
      });
    }
  }

  return { issues };
};
