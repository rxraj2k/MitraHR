-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recognition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromEmployeeId" TEXT NOT NULL,
    "toEmployeeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recognition_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recognition_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Recognition" ("category", "createdAt", "fromEmployeeId", "id", "message", "toEmployeeId") SELECT "category", "createdAt", "fromEmployeeId", "id", "message", "toEmployeeId" FROM "Recognition";
DROP TABLE "Recognition";
ALTER TABLE "new_Recognition" RENAME TO "Recognition";
CREATE INDEX "Recognition_toEmployeeId_createdAt_idx" ON "Recognition"("toEmployeeId", "createdAt");
CREATE INDEX "Recognition_createdAt_idx" ON "Recognition"("createdAt");
CREATE TABLE "new_RecognitionLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recognitionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reactionType" TEXT NOT NULL DEFAULT 'LIKE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecognitionLike_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "Recognition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecognitionLike_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecognitionLike" ("createdAt", "employeeId", "id", "recognitionId") SELECT "createdAt", "employeeId", "id", "recognitionId" FROM "RecognitionLike";
DROP TABLE "RecognitionLike";
ALTER TABLE "new_RecognitionLike" RENAME TO "RecognitionLike";
CREATE UNIQUE INDEX "RecognitionLike_recognitionId_employeeId_reactionType_key" ON "RecognitionLike"("recognitionId", "employeeId", "reactionType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
