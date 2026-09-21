import type {
  RecordingDayStatus,
  SegmentStatus,
} from "../../generated/prisma/client.ts";

export const computeDayStatus = (
  segmentStatuses: SegmentStatus[],
): RecordingDayStatus => {
  if (
    segmentStatuses.length === 0 ||
    segmentStatuses.every((status) => status === "received")
  ) {
    return "pending";
  }
  if (
    segmentStatuses.some(
      (status) => status === "received" || status === "processing",
    )
  ) {
    return "processing";
  }
  if (segmentStatuses.every((status) => status === "completed")) {
    return "completed";
  }
  if (segmentStatuses.every((status) => status === "failed")) {
    return "failed";
  }
  return "partial";
};
