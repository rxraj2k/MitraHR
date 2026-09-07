-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN "attachmentName" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN "attachmentUrl" TEXT;

-- CreateTable
CREATE TABLE "CompOffLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "workedDate" DATETIME NOT NULL,
    "daysEarned" REAL NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompOffLedger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompOffLedger_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeaveType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "annualQuota" REAL,
    "accrualMethod" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "carryForwardAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isCompOff" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LeaveType" ("accrualMethod", "active", "annualQuota", "carryForwardAllowed", "code", "createdAt", "id", "isPaid", "name", "updatedAt") SELECT "accrualMethod", "active", "annualQuota", "carryForwardAllowed", "code", "createdAt", "id", "isPaid", "name", "updatedAt" FROM "LeaveType";
DROP TABLE "LeaveType";
ALTER TABLE "new_LeaveType" RENAME TO "LeaveType";
CREATE UNIQUE INDEX "LeaveType_name_key" ON "LeaveType"("name");
CREATE UNIQUE INDEX "LeaveType_code_key" ON "LeaveType"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
