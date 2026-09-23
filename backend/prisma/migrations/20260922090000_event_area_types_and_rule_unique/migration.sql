-- AlterEnum
ALTER TYPE "AreaType" ADD VALUE 'noParking';
ALTER TYPE "AreaType" ADD VALUE 'parkingLot';
ALTER TYPE "AreaType" ADD VALUE 'trash';

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'illegalParking';
ALTER TYPE "EventType" ADD VALUE 'childRunning';
ALTER TYPE "EventType" ADD VALUE 'petWaste';

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "referenceImagePath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Rule_cameraId_eventType_key" ON "Rule"("cameraId", "eventType");
