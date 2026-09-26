-- CreateTable: AdminSettings (singleton row, id fixed to "default" -- same
-- pattern as AttendanceSettings).
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enforceMfaForAdmins" BOOLEAN NOT NULL DEFAULT false,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "sessionIdleTimeoutMin" INTEGER NOT NULL DEFAULT 30,
    "ipWhitelist" TEXT NOT NULL DEFAULT '',
    "appraisalEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "assetAssignmentNoticeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "documentExpiryAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "appraisalEmailSubjectTemplate" TEXT,
    "appraisalEmailBodyTemplate" TEXT,
    "backupSchedule" TEXT NOT NULL DEFAULT 'WEEKLY',
    "lastBackupAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "ipAddress" TEXT
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- Seed: the one singleton settings row, all defaults.
INSERT INTO "AdminSettings" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
