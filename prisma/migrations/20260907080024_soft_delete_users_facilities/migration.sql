-- AlterTable
ALTER TABLE "Facility" ADD COLUMN "deactivatedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deactivatedAt" DATETIME;
