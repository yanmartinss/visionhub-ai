export type RecordingDayStatus =
  | "pending"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

export type SegmentStatus = "received" | "processing" | "completed" | "failed";

export type SegmentSourceType = "upload" | "link";

export type SegmentProgressCounts = {
  total: number;
  received: number;
  processing: number;
  completed: number;
  failed: number;
};

export type Segment = {
  id: string;
  recordingDayId: string;
  sourceType: SegmentSourceType;
  fileHash: string | null;
  startedAt: string;
  durationSec: number | null;
  status: SegmentStatus;
  attempts: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CoverageIssueType = "gap" | "overlap" | "unknown";

export type CoverageIssue = {
  type: CoverageIssueType;
  fromSegmentId: string;
  toSegmentId: string;
  seconds: number;
};

export type CoverageInfo = { issues: CoverageIssue[] };

export type RecordingDay = {
  id: string;
  cameraId: string;
  camera: { id: string; name: string };
  // Calendar day; the API sends it as midnight UTC.
  date: string;
  status: RecordingDayStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type RecordingDayWithProgress = RecordingDay & {
  progress: SegmentProgressCounts;
};

export type RecordingDayDetail = RecordingDayWithProgress & {
  segments: Segment[];
  coverage: CoverageInfo;
};

export type CameraOption = {
  id: string;
  name: string;
  location: string;
  active: boolean;
  hasReferenceImage: boolean;
};

export type EventType =
  | "gateOpen"
  | "occupancy"
  | "restrictedArea"
  | "abandonedObject"
  | "illegalParking"
  | "childRunning"
  | "petWaste"
  | "other";

export type AreaType =
  | "restricted"
  | "sensitive"
  | "noParking"
  | "parkingLot"
  | "trash";

export type Rule = {
  id: string;
  cameraId: string;
  eventType: EventType;
  timeLimitSeconds: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AreaPoint = { x: number; y: number };

export type Area = {
  id: string;
  cameraId: string;
  type: AreaType;
  polygon: AreaPoint[];
  createdAt: string;
  updatedAt: string;
};

export type EventStatus = "pending" | "inProgress" | "resolved";

export type DetectedEvent = {
  id: string;
  cameraId: string;
  type: EventType;
  status: EventStatus;
  technicalDescription: string | null;
  startedAt: string;
  endedAt: string | null;
  segmentId: string | null;
  occurredAt: string | null;
  confidence: number | null;
  thumbnailPath: string | null;
  clipPath: string | null;
  createdAt: string;
};
