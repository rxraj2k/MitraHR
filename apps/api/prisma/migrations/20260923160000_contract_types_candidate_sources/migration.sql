-- CreateTable: ContractType
CREATE TABLE "ContractType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "ContractType_name_key" ON "ContractType"("name");

-- CreateTable: CandidateSource
CREATE TABLE "CandidateSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CandidateSource_name_key" ON "CandidateSource"("name");

-- Normalize existing Candidate.source values from their old fixed-enum
-- spelling (NAUKRI/LINKEDIN/REFERRAL/OTHER) to display-friendly names, now
-- that source becomes a growable Master Data lookup (like WorkLocation)
-- instead of a closed enum — matches how every other lookup-backed
-- free-text field in this app stores its display value directly.
UPDATE "Candidate" SET "source" = 'Naukri' WHERE "source" = 'NAUKRI';
UPDATE "Candidate" SET "source" = 'LinkedIn' WHERE "source" = 'LINKEDIN';
UPDATE "Candidate" SET "source" = 'Referral' WHERE "source" = 'REFERRAL';
UPDATE "Candidate" SET "source" = 'Other' WHERE "source" = 'OTHER';

-- Seed: ContractType — carry over every distinct non-empty contract type
-- already in use on a ClientContract record, then add the three examples
-- already hinted at in the contract form's own placeholder text (MSA, SOW,
-- NDA) if not already covered.
INSERT INTO "ContractType" ("id", "name", "active", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "contractType", 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "contractType" FROM "ClientContract" WHERE "contractType" IS NOT NULL AND trim("contractType") != '') AS distinct_types;

INSERT INTO "ContractType" ("id", "name", "active", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), v.name, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT 'MSA' AS name
  UNION ALL SELECT 'SOW'
  UNION ALL SELECT 'NDA'
) v
WHERE NOT EXISTS (SELECT 1 FROM "ContractType" ct WHERE ct."name" = v.name);

-- Seed: CandidateSource — carry over every distinct non-empty source
-- already in use on a Candidate record (post-normalization above), then add
-- the additional real-world channels (agency, company website, Google ad)
-- alongside the pre-existing ones, if not already covered.
INSERT INTO "CandidateSource" ("id", "name", "active", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), "source", 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "source" FROM "Candidate" WHERE "source" IS NOT NULL AND trim("source") != '') AS distinct_sources;

INSERT INTO "CandidateSource" ("id", "name", "active", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), v.name, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT 'Naukri' AS name
  UNION ALL SELECT 'LinkedIn'
  UNION ALL SELECT 'Referral'
  UNION ALL SELECT 'Agency'
  UNION ALL SELECT 'Company Website'
  UNION ALL SELECT 'Google Ad'
  UNION ALL SELECT 'Other'
) v
WHERE NOT EXISTS (SELECT 1 FROM "CandidateSource" cs WHERE cs."name" = v.name);
