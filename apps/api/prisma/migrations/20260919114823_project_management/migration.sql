-- AlterTable
ALTER TABLE "Project" ADD COLUMN "targetCompletionDate" DATETIME;

-- CreateTable
CREATE TABLE "_ProjectTechStack" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectTechStack_A_fkey" FOREIGN KEY ("A") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectTechStack_B_fkey" FOREIGN KEY ("B") REFERENCES "Technology" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectTechStack_AB_unique" ON "_ProjectTechStack"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectTechStack_B_index" ON "_ProjectTechStack"("B");
