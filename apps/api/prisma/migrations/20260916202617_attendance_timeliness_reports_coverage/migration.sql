-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AttendanceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "expectedStartTime" TEXT NOT NULL DEFAULT '17:00',
    "expectedStartTimeDst" TEXT NOT NULL DEFAULT '18:00',
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "earlyThresholdMinutes" INTEGER NOT NULL DEFAULT 10,
    "halfDayThresholdHours" REAL NOT NULL DEFAULT 4,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AttendanceSettings" ("expectedStartTime", "graceMinutes", "halfDayThresholdHours", "id", "updatedAt") SELECT "expectedStartTime", "graceMinutes", "halfDayThresholdHours", "id", "updatedAt" FROM "AttendanceSettings";
DROP TABLE "AttendanceSettings";
ALTER TABLE "new_AttendanceSettings" RENAME TO "AttendanceSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
