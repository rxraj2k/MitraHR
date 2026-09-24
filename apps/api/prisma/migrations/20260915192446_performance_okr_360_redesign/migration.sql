-- CreateTable
CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KeyResult_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "reviewCycleId" TEXT,
    "parentGoalId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "ReviewCycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "Goal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("category", "createdAt", "description", "dueDate", "employeeId", "id", "parentGoalId", "progress", "reviewCycleId", "status", "title", "updatedAt") SELECT "category", "createdAt", "description", "dueDate", "employeeId", "id", "parentGoalId", "progress", "reviewCycleId", "status", "title", "updatedAt" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE TABLE "new_PerformanceReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewCycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "overallRating" INTEGER,
    "potentialRating" INTEGER,
    "managerSummary" TEXT,
    "expectedPeerReviewers" INTEGER NOT NULL DEFAULT 3,
    "employeeAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PerformanceReview_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "ReviewCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PerformanceReview" ("acknowledgedAt", "createdAt", "employeeAcknowledged", "employeeId", "id", "managerSummary", "overallRating", "reviewCycleId", "status", "updatedAt") SELECT "acknowledgedAt", "createdAt", "employeeAcknowledged", "employeeId", "id", "managerSummary", "overallRating", "reviewCycleId", "status", "updatedAt" FROM "PerformanceReview";
DROP TABLE "PerformanceReview";
ALTER TABLE "new_PerformanceReview" RENAME TO "PerformanceReview";
CREATE UNIQUE INDEX "PerformanceReview_reviewCycleId_employeeId_key" ON "PerformanceReview"("reviewCycleId", "employeeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
