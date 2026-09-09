-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN "checkOutAt" DATETIME;

-- CreateTable
CREATE TABLE "AttendanceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "expectedStartTime" TEXT NOT NULL DEFAULT '09:30',
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "halfDayThresholdHours" REAL NOT NULL DEFAULT 4,
    "updatedAt" DATETIME NOT NULL
);
