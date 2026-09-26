-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
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
INSERT INTO "new_AdminSettings" ("appraisalEmailBodyTemplate", "appraisalEmailEnabled", "appraisalEmailSubjectTemplate", "assetAssignmentNoticeEnabled", "backupSchedule", "documentExpiryAlertEnabled", "enforceMfaForAdmins", "id", "ipWhitelist", "lastBackupAt", "passwordExpiryDays", "sessionIdleTimeoutMin", "updatedAt") SELECT "appraisalEmailBodyTemplate", "appraisalEmailEnabled", "appraisalEmailSubjectTemplate", "assetAssignmentNoticeEnabled", "backupSchedule", "documentExpiryAlertEnabled", "enforceMfaForAdmins", "id", "ipWhitelist", "lastBackupAt", "passwordExpiryDays", "sessionIdleTimeoutMin", "updatedAt" FROM "AdminSettings";
DROP TABLE "AdminSettings";
ALTER TABLE "new_AdminSettings" RENAME TO "AdminSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
