-- CreateEnum
CREATE TYPE "RecordingDayStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "SegmentStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SegmentSourceType" AS ENUM ('UPLOAD', 'LINK');

-- AlterTable
ALTER TABLE "DailySummary" ADD COLUMN     "recordingDayId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "clipPath" TEXT,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "occurredAt" TIMESTAMP(3),
ADD COLUMN     "segmentId" TEXT,
ADD COLUMN     "thumbnailPath" TEXT;

-- CreateTable
CREATE TABLE "RecordingDay" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "RecordingDayStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "recordingDayId" TEXT NOT NULL,
    "sourceType" "SegmentSourceType" NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "fileHash" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationSec" INTEGER,
    "status" "SegmentStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecordingDay_cameraId_date_key" ON "RecordingDay"("cameraId", "date");

-- CreateIndex
CREATE INDEX "Segment_recordingDayId_startedAt_idx" ON "Segment"("recordingDayId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Segment_recordingDayId_fileHash_key" ON "Segment"("recordingDayId", "fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_recordingDayId_key" ON "DailySummary"("recordingDayId");

-- CreateIndex
CREATE INDEX "Event_segmentId_idx" ON "Event"("segmentId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_recordingDayId_fkey" FOREIGN KEY ("recordingDayId") REFERENCES "RecordingDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingDay" ADD CONSTRAINT "RecordingDay_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingDay" ADD CONSTRAINT "RecordingDay_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_recordingDayId_fkey" FOREIGN KEY ("recordingDayId") REFERENCES "RecordingDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

