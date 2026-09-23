-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('pending', 'inProgress', 'resolved');
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_eventId_fkey";
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'pending';
-- AlterTable
ALTER TABLE "Segment" ADD COLUMN     "metadataStartedAt" TIMESTAMP(3),
ADD COLUMN     "warning" TEXT;
-- CreateTable
CREATE TABLE "DetectionInterval" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,
    "touchesStart" BOOLEAN NOT NULL,
    "touchesEnd" BOOLEAN NOT NULL,
    "maxConfidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DetectionInterval_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "DetectionInterval_segmentId_idx" ON "DetectionInterval"("segmentId");
-- CreateIndex
CREATE INDEX "DetectionInterval_segmentId_eventType_idx" ON "DetectionInterval"("segmentId", "eventType");
-- CreateIndex
CREATE UNIQUE INDEX "Event_cameraId_type_occurredAt_key" ON "Event"("cameraId", "type", "occurredAt");
-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DetectionInterval" ADD CONSTRAINT "DetectionInterval_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
