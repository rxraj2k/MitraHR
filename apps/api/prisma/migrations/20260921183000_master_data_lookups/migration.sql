-- AlterTable: User (last login tracking for the Admins tab)
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;

-- AlterTable: Holiday (National / Regional / Floating tag)
ALTER TABLE "Holiday" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'NATIONAL';

-- CreateTable: AssetCategory
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'HARDWARE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "AssetCategory_name_key" ON "AssetCategory"("name");

-- CreateTable: AssetVendor
CREATE TABLE "AssetVendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "AssetVendor_name_key" ON "AssetVendor"("name");

-- CreateTable: DocumentType
CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "DocumentType_name_appliesTo_key" ON "DocumentType"("name", "appliesTo");

-- CreateTable: WorkLocation
CREATE TABLE "WorkLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "WorkLocation_name_key" ON "WorkLocation"("name");

-- AlterTable: Asset (optional vendor link)
ALTER TABLE "Asset" ADD COLUMN "vendorId" TEXT REFERENCES "AssetVendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: AssetCategory — preserves the existing fixed category list
-- (apps/web/src/lib/assetCategories.ts) as the master-data baseline so
-- nothing changes for existing Asset rows on migrate.
INSERT INTO "AssetCategory" ("id", "name", "kind", "active", "createdAt", "updatedAt") VALUES
  (lower(hex(randomblob(16))), 'Laptops', 'HARDWARE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Monitors', 'HARDWARE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Peripherals', 'HARDWARE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Mobile Phones', 'HARDWARE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'ID Cards', 'HARDWARE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Software Licenses', 'SOFTWARE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Networking Equipment', 'HARDWARE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Other', 'HARDWARE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed: DocumentType (EMPLOYEE) — preserves the existing fixed employee
-- document type list (apps/web/src/lib/documentCategories.ts).
INSERT INTO "DocumentType" ("id", "name", "appliesTo", "active", "createdAt", "updatedAt") VALUES
  (lower(hex(randomblob(16))), 'Offer Letter', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'ID Proof', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'PAN Card', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Academic Certificate', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Experience Letter', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Contract', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Certification', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Visa', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Other', 'EMPLOYEE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed: DocumentType (COMPANY) — preserves the existing fixed company
-- document category list.
INSERT INTO "DocumentType" ("id", "name", "appliesTo", "active", "createdAt", "updatedAt") VALUES
  (lower(hex(randomblob(16))), 'Policy', 'COMPANY', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Template', 'COMPANY', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Handbook', 'COMPANY', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (lower(hex(randomblob(16))), 'Other', 'COMPANY', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed: WorkLocation — first, carry over every distinct non-empty location
-- string already in use on an Employee record, so nobody's existing value
-- becomes an orphan; then add the three example hubs from the brief if not
-- already covered.
INSERT INTO "WorkLocation" ("id", "name", "region", "active", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "workLocation", NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "workLocation" FROM "Employee" WHERE "workLocation" IS NOT NULL AND trim("workLocation") != '') AS distinct_locations;

INSERT INTO "WorkLocation" ("id", "name", "region", "active", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), v.name, v.region, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT 'US East' AS name, 'US' AS region
  UNION ALL SELECT 'India HQ', 'INDIA'
  UNION ALL SELECT 'Remote', NULL
) v
WHERE NOT EXISTS (SELECT 1 FROM "WorkLocation" wl WHERE wl."name" = v.name);
