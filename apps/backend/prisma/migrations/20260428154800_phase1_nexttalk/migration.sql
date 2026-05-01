-- Phase 1: Add username system, privacy modes, contacts, and message status tracking

-- Add new enums
CREATE TYPE "PrivacyMode" AS ENUM ('PUBLIC', 'PRIVATE', 'SEMI_PRIVATE');
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'SEEN');

-- Alter User table
ALTER TABLE "User" ADD COLUMN "username" VARCHAR(50) UNIQUE;
ALTER TABLE "User" ADD COLUMN "usernameSearchLower" VARCHAR(50) UNIQUE;
ALTER TABLE "User" ADD COLUMN "privacyMode" "PrivacyMode" NOT NULL DEFAULT 'PUBLIC';

-- Create indexes for username search
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_usernameSearchLower_idx" ON "User"("usernameSearchLower");

-- Alter Profile table
ALTER TABLE "Profile" ADD COLUMN "privacyMode" "PrivacyMode" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Profile" ADD COLUMN "profileImageUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add index for Profile lookup
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- Create Contact table
CREATE TABLE "Contact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "contactUserId" TEXT,
  "contactPhoneNumber" VARCHAR(20),
  "contactPhoneNumberHash" VARCHAR(64),
  "displayName" TEXT,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "blockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
  CONSTRAINT "Contact_contactUserId_fkey" FOREIGN KEY ("contactUserId") REFERENCES "User" ("id") ON DELETE SET NULL
);

-- Create unique constraint for Contact
CREATE UNIQUE INDEX "Contact_userId_contactUserId_key" ON "Contact"("userId", "contactUserId");
CREATE INDEX "Contact_userId_createdAt_idx" ON "Contact"("userId", "createdAt");
CREATE INDEX "Contact_contactPhoneNumberHash_idx" ON "Contact"("contactPhoneNumberHash");

-- Create Block table
CREATE TABLE "Block" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "blockingUserId" TEXT NOT NULL,
  "blockedUserId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Block_blockingUserId_fkey" FOREIGN KEY ("blockingUserId") REFERENCES "User" ("id") ON DELETE CASCADE,
  CONSTRAINT "Block_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Create unique constraint for Block
CREATE UNIQUE INDEX "Block_blockingUserId_blockedUserId_key" ON "Block"("blockingUserId", "blockedUserId");
CREATE INDEX "Block_blockedUserId_idx" ON "Block"("blockedUserId");

-- Alter Chat table for channel support
ALTER TABLE "Chat" ADD COLUMN "isChannel" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Chat" ADD COLUMN "description" TEXT;
ALTER TABLE "Chat" ADD COLUMN "creatorId" TEXT;
ALTER TABLE "Chat" ADD COLUMN "subscriberCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Chat" ADD COLUMN "pinnedMessageId" TEXT;
ALTER TABLE "Chat" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for Chat
CREATE INDEX "Chat_isChannel_idx" ON "Chat"("isChannel");
CREATE INDEX "Chat_creatorId_idx" ON "Chat"("creatorId");

-- Alter ChatMessage table for message status
ALTER TABLE "ChatMessage" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'SENT';

-- Reply / quote (WhatsApp-like)
ALTER TABLE "ChatMessage" ADD COLUMN "replyToId" TEXT;
ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for message status
CREATE INDEX "ChatMessage_status_idx" ON "ChatMessage"("status");

-- Index for reply lookups
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

-- Add relations for User (contacts and blocking)
-- These are handled by Prisma relations, not database constraints
