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
};

export type CameraOption = {
  id: string;
  name: string;
  location: string;
  active: boolean;
};
