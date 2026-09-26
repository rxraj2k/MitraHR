-- AlterTable: Employee -- simple stored payroll figure for the appraisal
-- compensation workflow (this app has no separate payroll module).
ALTER TABLE "Employee" ADD COLUMN "currentCTC" REAL;

-- AlterTable: Employee -- personal email opt-out for the two appraisal
-- emails (trigger + finalized), same pattern as the other four categories.
ALTER TABLE "Employee" ADD COLUMN "emailOnAppraisal" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: AppraisalCriterion (master-data scorecard definition)
CREATE TABLE "AppraisalCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: Appraisal
CREATE TABLE "Appraisal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "emailSentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING_EMPLOYEE',
    "selfSubmittedAt" DATETIME,
    "selfCareerGoals" TEXT,
    "selfManagementSupport" TEXT,
    "selfCertifications" TEXT,
    "managerReviewedByUserId" TEXT,
    "managerReviewedAt" DATETIME,
    "selfWeightedScore" REAL,
    "managerWeightedScore" REAL,
    "currentCTC" REAL,
    "incrementPercent" REAL,
    "incrementAmount" REAL,
    "revisedCTC" REAL,
    "effectiveDate" DATETIME,
    "finalizedAt" DATETIME,
    "finalizedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appraisal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appraisal_managerReviewedByUserId_fkey" FOREIGN KEY ("managerReviewedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appraisal_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: AppraisalCriterionScore
CREATE TABLE "AppraisalCriterionScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appraisalId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "selfRating" INTEGER,
    "selfComment" TEXT,
    "managerRating" INTEGER,
    "managerComment" TEXT,
    CONSTRAINT "AppraisalCriterionScore_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalCriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "AppraisalCriterion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: AppraisalSkill
CREATE TABLE "AppraisalSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appraisalId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    CONSTRAINT "AppraisalSkill_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppraisalSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Appraisal_employeeId_cycleNumber_key" ON "Appraisal"("employeeId", "cycleNumber");
CREATE UNIQUE INDEX "AppraisalCriterionScore_appraisalId_criterionId_key" ON "AppraisalCriterionScore"("appraisalId", "criterionId");
CREATE UNIQUE INDEX "AppraisalSkill_appraisalId_skillId_key" ON "AppraisalSkill"("appraisalId", "skillId");

-- Seed: the 5 default weighted criteria from the original spec.
INSERT INTO "AppraisalCriterion" ("id", "name", "description", "weight", "sortOrder", "active", "createdAt", "updatedAt") VALUES
    (lower(hex(randomblob(16))), 'Client & Project Performance', 'Quality of work, meeting deadlines, client feedback, task ownership, reliability.', 30, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'Technical Skills & Problem Solving', 'Technical competency, troubleshooting, logical thinking, solution quality, independent execution.', 25, 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'Ownership & Proactiveness', 'Taking initiative, following up without reminders, identifying issues early, suggesting improvements.', 20, 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'Communication & Professionalism', 'Client communication, meeting participation, timely responses, transparency, teamwork, conduct.', 10, 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (lower(hex(randomblob(16))), 'Learning & Skill Development', 'Continuous learning, learning plan completion, certifications/upskilling, applying new skills.', 15, 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
