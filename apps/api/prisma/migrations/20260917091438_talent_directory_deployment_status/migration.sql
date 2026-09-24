-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeCode" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "address" TEXT,
    "photoUrl" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "experienceLevel" TEXT NOT NULL DEFAULT 'MID',
    "deploymentStatus" TEXT NOT NULL DEFAULT 'BENCH',
    "departmentId" TEXT,
    "designationId" TEXT,
    "team" TEXT,
    "workLocation" TEXT,
    "reportingManagerId" TEXT,
    "systemRole" TEXT DEFAULT 'EMPLOYEE',
    "dateOfJoining" DATETIME,
    "dateOfBirth" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("address", "createdAt", "dateOfBirth", "dateOfJoining", "departmentId", "designationId", "email", "emergencyContactName", "emergencyContactPhone", "employeeCode", "employmentType", "fullName", "id", "phone", "photoUrl", "reportingManagerId", "status", "systemRole", "team", "updatedAt", "workLocation") SELECT "address", "createdAt", "dateOfBirth", "dateOfJoining", "departmentId", "designationId", "email", "emergencyContactName", "emergencyContactPhone", "employeeCode", "employmentType", "fullName", "id", "phone", "photoUrl", "reportingManagerId", "status", "systemRole", "team", "updatedAt", "workLocation" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
