-- Add saved posts for feed (Instagram-like)
CREATE TABLE IF NOT EXISTS "FeedPostSave" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedPostSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FeedPostSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeedPostSave_postId_userId_key" ON "FeedPostSave"("postId", "userId");
CREATE INDEX IF NOT EXISTS "FeedPostSave_userId_createdAt_idx" ON "FeedPostSave"("userId", "createdAt");
