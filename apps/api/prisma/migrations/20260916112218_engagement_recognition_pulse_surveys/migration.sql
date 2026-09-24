-- CreateTable
CREATE TABLE "Recognition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromEmployeeId" TEXT NOT NULL,
    "toEmployeeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recognition_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recognition_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecognitionLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recognitionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecognitionLike_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "Recognition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecognitionLike_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecognitionComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recognitionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecognitionComment_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "Recognition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecognitionComment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PulseSurvey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "audienceType" TEXT NOT NULL DEFAULT 'ALL',
    "closesAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PulseSurvey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PulseSurveyDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surveyId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    CONSTRAINT "PulseSurveyDepartment_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PulseSurvey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PulseSurveyDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PulseSurveyQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surveyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PulseSurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PulseSurvey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PulseSurveyResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surveyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PulseSurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PulseSurvey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PulseSurveyResponse_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PulseSurveyAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "ratingValue" INTEGER,
    "boolValue" BOOLEAN,
    "textValue" TEXT,
    CONSTRAINT "PulseSurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "PulseSurveyResponse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PulseSurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PulseSurveyQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Recognition_toEmployeeId_createdAt_idx" ON "Recognition"("toEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "Recognition_createdAt_idx" ON "Recognition"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecognitionLike_recognitionId_employeeId_key" ON "RecognitionLike"("recognitionId", "employeeId");

-- CreateIndex
CREATE INDEX "RecognitionComment_recognitionId_createdAt_idx" ON "RecognitionComment"("recognitionId", "createdAt");

-- CreateIndex
CREATE INDEX "PulseSurvey_status_createdAt_idx" ON "PulseSurvey"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PulseSurveyDepartment_surveyId_departmentId_key" ON "PulseSurveyDepartment"("surveyId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseSurveyResponse_surveyId_employeeId_key" ON "PulseSurveyResponse"("surveyId", "employeeId");
