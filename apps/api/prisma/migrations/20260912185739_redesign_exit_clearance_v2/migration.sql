/*
  Warnings:

  - Added the required column `resignationDate` to the `EmployeeExit` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ExitCategoryApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exitId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "ExitCategoryApproval_exitId_fkey" FOREIGN KEY ("exitId") REFERENCES "EmployeeExit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExitHandover" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exitId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "primarySuccessorId" TEXT,
    "secondarySuccessorId" TEXT,
    "notes" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExitHandover_exitId_fkey" FOREIGN KEY ("exitId") REFERENCES "EmployeeExit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExitHandover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExitHandover_primarySuccessorId_fkey" FOREIGN KEY ("primarySuccessorId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExitHandover_secondarySuccessorId_fkey" FOREIGN KEY ("secondarySuccessorId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExitDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exitId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExitDocument_exitId_fkey" FOREIGN KEY ("exitId") REFERENCES "EmployeeExit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmployeeExit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "resignationDate" DATETIME NOT NULL,
    "lastWorkingDay" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "initiatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "accessRevocationAt" DATETIME,
    "interviewCompletedAt" DATETIME,
    "cultureScore" INTEGER,
    "managementFeedback" TEXT,
    "rehireEligible" BOOLEAN,
    CONSTRAINT "EmployeeExit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmployeeExit" ("completedAt", "employeeId", "id", "initiatedAt", "lastWorkingDay", "notes", "reason", "status") SELECT "completedAt", "employeeId", "id", "initiatedAt", "lastWorkingDay", "notes", "reason", "status" FROM "EmployeeExit";
DROP TABLE "EmployeeExit";
ALTER TABLE "new_EmployeeExit" RENAME TO "EmployeeExit";
CREATE UNIQUE INDEX "EmployeeExit_employeeId_key" ON "EmployeeExit"("employeeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ExitCategoryApproval_exitId_group_key" ON "ExitCategoryApproval"("exitId", "group");

-- CreateIndex
CREATE UNIQUE INDEX "ExitHandover_exitId_projectId_key" ON "ExitHandover"("exitId", "projectId");
