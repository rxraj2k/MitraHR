-- AlterTable
ALTER TABLE "EmployeeDocument" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "EmployeeDocument" ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "CompanyDocument" ADD COLUMN "description" TEXT;
ALTER TABLE "CompanyDocument" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "CompanyDocument" ADD COLUMN "requiresAcknowledgment" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing POLICY-category documents already behave as requiring
-- acknowledgment today (see CompanyDocumentsService.findAll's hardcoded
-- category === 'POLICY' check, now replaced by this column) — preserve that
-- behavior for documents uploaded before the toggle existed.
UPDATE "CompanyDocument" SET "requiresAcknowledgment" = true WHERE "category" = 'POLICY';
