-- AlterTable
ALTER TABLE "Client" ADD COLUMN "region" TEXT;

-- CreateTable
CREATE TABLE "CompanyDocumentAcknowledgment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyDocumentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "acknowledgedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyDocumentAcknowledgment_companyDocumentId_fkey" FOREIGN KEY ("companyDocumentId") REFERENCES "CompanyDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompanyDocumentAcknowledgment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DesignationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "fromDesignationId" TEXT,
    "toDesignationId" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "DesignationHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DesignationHistory_fromDesignationId_fkey" FOREIGN KEY ("fromDesignationId") REFERENCES "Designation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DesignationHistory_toDesignationId_fkey" FOREIGN KEY ("toDesignationId") REFERENCES "Designation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDocumentAcknowledgment_companyDocumentId_employeeId_key" ON "CompanyDocumentAcknowledgment"("companyDocumentId", "employeeId");

-- CreateIndex
CREATE INDEX "DesignationHistory_employeeId_changedAt_idx" ON "DesignationHistory"("employeeId", "changedAt");
