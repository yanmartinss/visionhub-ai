-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isMaster" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Condominium" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Condominium_pkey" PRIMARY KEY ("id")
);
