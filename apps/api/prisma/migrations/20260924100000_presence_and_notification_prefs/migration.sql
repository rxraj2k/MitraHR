-- AlterTable: Employee -- presence toggle + per-category email opt-outs
ALTER TABLE "Employee" ADD COLUMN "presenceStatus" TEXT NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "Employee" ADD COLUMN "emailOnLeaveDecision" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN "emailOnAnnouncement" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN "emailOnAssessmentResult" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN "emailOnBirthday" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: User -- presence toggle for a STAFF session's own header dot
ALTER TABLE "User" ADD COLUMN "presenceStatus" TEXT NOT NULL DEFAULT 'AVAILABLE';
