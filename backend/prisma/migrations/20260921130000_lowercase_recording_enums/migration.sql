-- RenameEnumValue
ALTER TYPE "RecordingDayStatus" RENAME VALUE 'PENDING' TO 'pending';
ALTER TYPE "RecordingDayStatus" RENAME VALUE 'PROCESSING' TO 'processing';
ALTER TYPE "RecordingDayStatus" RENAME VALUE 'COMPLETED' TO 'completed';
ALTER TYPE "RecordingDayStatus" RENAME VALUE 'PARTIAL' TO 'partial';
ALTER TYPE "RecordingDayStatus" RENAME VALUE 'FAILED' TO 'failed';

ALTER TYPE "SegmentStatus" RENAME VALUE 'RECEIVED' TO 'received';
ALTER TYPE "SegmentStatus" RENAME VALUE 'PROCESSING' TO 'processing';
ALTER TYPE "SegmentStatus" RENAME VALUE 'COMPLETED' TO 'completed';
ALTER TYPE "SegmentStatus" RENAME VALUE 'FAILED' TO 'failed';

ALTER TYPE "SegmentSourceType" RENAME VALUE 'UPLOAD' TO 'upload';
ALTER TYPE "SegmentSourceType" RENAME VALUE 'LINK' TO 'link';
