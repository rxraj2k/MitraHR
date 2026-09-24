/*
  Warnings:

  - Added the required column `refCode` to the `JobOpening` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "_JobOpeningToTechnology" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_JobOpeningToTechnology_A_fkey" FOREIGN KEY ("A") REFERENCES "JobOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_JobOpeningToTechnology_B_fkey" FOREIGN KEY ("B") REFERENCES "Technology" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobOpeningId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'OTHER',
    "stage" TEXT NOT NULL DEFAULT 'APPLIED',
    "screeningNotes" TEXT,
    "screeningRating" INTEGER,
    "technicalNotes" TEXT,
    "technicalRating" INTEGER,
    "finalRoundNotes" TEXT,
    "finalRoundRating" INTEGER,
    "nextInterviewAt" DATETIME,
    "rejectionReason" TEXT,
    "resumeFileName" TEXT,
    "resumeUrl" TEXT,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiredAt" DATETIME,
    "convertedEmployeeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidate_jobOpeningId_fkey" FOREIGN KEY ("jobOpeningId") REFERENCES "JobOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Candidate_convertedEmployeeId_fkey" FOREIGN KEY ("convertedEmployeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Candidate" ("appliedAt", "createdAt", "email", "finalRoundNotes", "fullName", "hiredAt", "id", "jobOpeningId", "phone", "rejectionReason", "resumeFileName", "resumeUrl", "screeningNotes", "source", "stage", "technicalNotes", "updatedAt") SELECT "appliedAt", "createdAt", "email", "finalRoundNotes", "fullName", "hiredAt", "id", "jobOpeningId", "phone", "rejectionReason", "resumeFileName", "resumeUrl", "screeningNotes", "source", "stage", "technicalNotes", "updatedAt" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
CREATE UNIQUE INDEX "Candidate_convertedEmployeeId_key" ON "Candidate"("convertedEmployeeId");
CREATE TABLE "new_JobOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "refCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "departmentId" TEXT,
    "projectId" TEXT,
    "hiringManagerId" TEXT,
    "employmentType" TEXT,
    "experienceLevel" TEXT,
    "salaryRange" TEXT,
    "headcountTarget" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobOpening_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JobOpening_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JobOpening_hiringManagerId_fkey" FOREIGN KEY ("hiringManagerId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_JobOpening" ("closedAt", "createdAt", "departmentId", "description", "id", "openedAt", "status", "title", "updatedAt") SELECT "closedAt", "createdAt", "departmentId", "description", "id", "openedAt", "status", "title", "updatedAt" FROM "JobOpening";
DROP TABLE "JobOpening";
ALTER TABLE "new_JobOpening" RENAME TO "JobOpening";
CREATE UNIQUE INDEX "JobOpening_refCode_key" ON "JobOpening"("refCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_JobOpeningToTechnology_AB_unique" ON "_JobOpeningToTechnology"("A", "B");

-- CreateIndex
CREATE INDEX "_JobOpeningToTechnology_B_index" ON "_JobOpeningToTechnology"("B");
