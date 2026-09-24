-- Quiz can now be scoped to a whole track (Mandatory Training) instead of
-- always to a single course. courseId becomes nullable, a new nullable
-- unique "track" column is added, and a CHECK constraint enforces that
-- exactly one of courseId/track is set on every row. SQLite requires the
-- standard "redefine table" pattern for this (no ALTER COLUMN support).

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT,
    "track" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Knowledge Check',
    "passPercent" INTEGER NOT NULL DEFAULT 70,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quiz_scope_check" CHECK (
        ("courseId" IS NOT NULL AND "track" IS NULL) OR
        ("courseId" IS NULL AND "track" IS NOT NULL)
    )
);

INSERT INTO "new_Quiz" ("id", "courseId", "title", "passPercent", "active", "createdAt", "updatedAt")
SELECT "id", "courseId", "title", "passPercent", "active", "createdAt", "updatedAt" FROM "Quiz";

DROP TABLE "Quiz";
ALTER TABLE "new_Quiz" RENAME TO "Quiz";

CREATE UNIQUE INDEX "Quiz_courseId_key" ON "Quiz"("courseId");
CREATE UNIQUE INDEX "Quiz_track_key" ON "Quiz"("track");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
