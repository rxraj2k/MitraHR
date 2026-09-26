-- CreateTable
CREATE TABLE "OfficeWallPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "taggedEmployeeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OfficeWallPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OfficeWallPost_taggedEmployeeId_fkey" FOREIGN KEY ("taggedEmployeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfficeWallMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OfficeWallMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OfficeWallPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfficeWallMention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    CONSTRAINT "OfficeWallMention_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OfficeWallPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OfficeWallMention_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfficeWallLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reactionType" TEXT NOT NULL DEFAULT 'LIKE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficeWallLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OfficeWallPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OfficeWallLike_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfficeWallComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficeWallComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OfficeWallPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OfficeWallComment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OfficeWallPost_createdAt_idx" ON "OfficeWallPost"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeWallMention_postId_employeeId_key" ON "OfficeWallMention"("postId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeWallLike_postId_employeeId_reactionType_key" ON "OfficeWallLike"("postId", "employeeId", "reactionType");

-- CreateIndex
CREATE INDEX "OfficeWallComment_postId_createdAt_idx" ON "OfficeWallComment"("postId", "createdAt");
