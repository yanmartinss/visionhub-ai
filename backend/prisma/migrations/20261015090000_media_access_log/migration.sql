-- CreateTable
CREATE TABLE "MediaAccessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAccessLog_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "MediaAccessLog_eventId_createdAt_idx" ON "MediaAccessLog"("eventId", "createdAt");
-- CreateIndex
CREATE INDEX "MediaAccessLog_userId_createdAt_idx" ON "MediaAccessLog"("userId", "createdAt");
-- AddForeignKey
ALTER TABLE "MediaAccessLog" ADD CONSTRAINT "MediaAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
