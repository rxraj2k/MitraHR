-- CreateTable
CREATE TABLE "RoleTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleTrack_name_key" ON "RoleTrack"("name");

-- AlterTable: add roleTrack, hrRoundNotes, hrRoundRating (all nullable, simple add)
ALTER TABLE "Candidate" ADD COLUMN "roleTrack" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "hrRoundNotes" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "hrRoundRating" INTEGER;

-- RedefineTables: Candidate.email NOT NULL -> nullable (SQLite requires a table rebuild for this)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobOpeningId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'OTHER',
    "roleTrack" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'APPLIED',
    "screeningNotes" TEXT,
    "screeningRating" INTEGER,
    "technicalNotes" TEXT,
    "technicalRating" INTEGER,
    "finalRoundNotes" TEXT,
    "finalRoundRating" INTEGER,
    "hrRoundNotes" TEXT,
    "hrRoundRating" INTEGER,
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
INSERT INTO "new_Candidate" ("id", "jobOpeningId", "fullName", "email", "phone", "source", "roleTrack", "stage", "screeningNotes", "screeningRating", "technicalNotes", "technicalRating", "finalRoundNotes", "finalRoundRating", "hrRoundNotes", "hrRoundRating", "nextInterviewAt", "rejectionReason", "resumeFileName", "resumeUrl", "appliedAt", "hiredAt", "convertedEmployeeId", "createdAt", "updatedAt")
SELECT "id", "jobOpeningId", "fullName", "email", "phone", "source", "roleTrack", "stage", "screeningNotes", "screeningRating", "technicalNotes", "technicalRating", "finalRoundNotes", "finalRoundRating", "hrRoundNotes", "hrRoundRating", "nextInterviewAt", "rejectionReason", "resumeFileName", "resumeUrl", "appliedAt", "hiredAt", "convertedEmployeeId", "createdAt", "updatedAt" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
CREATE UNIQUE INDEX "Candidate_convertedEmployeeId_key" ON "Candidate"("convertedEmployeeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
