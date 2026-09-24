-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "reviewCycleId" TEXT,
    "parentGoalId" TEXT,
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
    CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "goalId" TEXT,
    "progressUpdate" TEXT NOT NULL,
    "blockers" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'ON_TRACK',
    "checkInDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckIn_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewCycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "overallRating" INTEGER,
    "managerSummary" TEXT,
    "employeeAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PerformanceReview_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "ReviewCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "performanceReviewId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "raterType" TEXT NOT NULL,
    "communicationRating" INTEGER,
    "technicalRating" INTEGER,
    "teamworkRating" INTEGER,
    "goalAchievementRating" INTEGER,
    "comments" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewFeedback_performanceReviewId_fkey" FOREIGN KEY ("performanceReviewId") REFERENCES "PerformanceReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewFeedback_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCycle_name_key" ON "ReviewCycle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceReview_reviewCycleId_employeeId_key" ON "PerformanceReview"("reviewCycleId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewFeedback_performanceReviewId_raterId_raterType_key" ON "ReviewFeedback"("performanceReviewId", "raterId", "raterType");
