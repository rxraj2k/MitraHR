-- AlterTable: Announcement (sticky-note color, for the redesigned
-- Announcements board / dashboard widget)
ALTER TABLE "Announcement" ADD COLUMN "color" TEXT;

-- Backfill: existing announcements predate the color column, so give each
-- one a random note color from the same fixed palette new posts draw from
-- (STICKY_COLORS in announcements.service.ts) rather than leaving them all
-- blank/white.
UPDATE "Announcement"
SET "color" = (
  CASE ABS(RANDOM()) % 7
    WHEN 0 THEN 'yellow'
    WHEN 1 THEN 'pink'
    WHEN 2 THEN 'blue'
    WHEN 3 THEN 'green'
    WHEN 4 THEN 'orange'
    WHEN 5 THEN 'purple'
    ELSE 'teal'
  END
)
WHERE "color" IS NULL;
