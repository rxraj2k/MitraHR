-- CreateTable
CREATE TABLE "SandboxPlacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SandboxPlacement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SandboxPlacement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SandboxPlacement_employeeId_key" ON "SandboxPlacement"("employeeId");
