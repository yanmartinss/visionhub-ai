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

export type EventStatus =
  | "pending"
  | "inProgress"
  | "resolved"
  | "falsePositive";

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

// Fatia D contract (docs/agentes/README.md, section 3.3). Dates `YYYY-MM-DD`
// in queries are the recording day's date, not the event's local time.
export type EventListItem = {
  id: string;
  type: EventType;
  status: EventStatus;
  occurredAt: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  confidence: number | null;
  technicalDescription: string | null;
  hasThumbnail: boolean;
  hasClip: boolean;
  camera: { id: string; name: string; location: string };
  // Midnight UTC, like `RecordingDay.date`.
  recordingDay: { id: string; date: string } | null;
};

export type EventFilters = {
  from?: string;
  to?: string;
  type?: EventType;
  cameraId?: string;
  status?: EventStatus;
  page?: number;
  pageSize?: number;
};

export type EventPage = {
  items: EventListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type DashboardData = {
  // Midnight UTC of the requested day.
  date: string;
  totals: {
    events: number;
    previousDayEvents: number;
    byType: Record<EventType, number>;
    byStatus: Record<EventStatus, number>;
  };
  // pending + inProgress across all days.
  openEvents: number;
  cameras: {
    active: number;
    total: number;
    items: { id: string; name: string; location: string; active: boolean }[];
  };
  recordingDays: {
    id: string;
    cameraId: string;
    cameraName: string;
    status: RecordingDayStatus;
    progress: SegmentProgressCounts;
  }[];
  latestEvents: EventListItem[];
};

// `GET /recording-days/:id/summary` (Fatia F, docs/agentes/README.md 3.2).
export type DaySummary = {
  generatedText: string;
  createdAt: string;
};

// `GET /events/:id` (US33, docs/agentes/README.md section 3.3).
export type EventDetail = EventListItem & {
  detectionLabel: string | null;
  // Center of the box inside/outside the areas of the required type;
  // null = whole camera.
  containment: "inside" | "outside" | null;
  // The camera's CURRENT rule for the type, not the one at detection time.
  rule: { timeLimitSeconds: number | null; active: boolean } | null;
  // All areas of the required type (the API does not record which one fired).
  areas: { id: string; type: AreaType; polygon: AreaPoint[] }[];
  segment: { id: string; startedAt: string } | null;
  offsetSec: number | null;
};
