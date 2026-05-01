import { prisma } from "../config/nextalkdb";
import { logger } from "../utils/nextalklogger";
import { isContact } from "./nextalkcontact.service";
import { isUserBlocked } from "./nextalkblock.service";

export type PrivacyMode = "PUBLIC" | "PRIVATE" | "SEMI_PRIVATE";

/**
 * Get user's privacy settings
 */
export async function getUserPrivacySettings(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        privacyMode: true,
        profile: {
          select: {
            privacyMode: true,
            isPrivate: true
          }
        }
      }
    });

    return user;
  } catch (error) {
    logger.error("Error getting privacy settings", { userId, error });
    return null;
  }
}

/**
 * Update user's privacy mode
 */
export async function updatePrivacyMode(userId: string, privacyMode: PrivacyMode) {
  if (!["PUBLIC", "PRIVATE", "SEMI_PRIVATE"].includes(privacyMode)) {
    return { success: false, error: "Invalid privacy mode" };
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        privacyMode: privacyMode as any
      }
    });

    // Also update profile
    await prisma.profile.update({
      where: { userId },
      data: {
        privacyMode: privacyMode as any,
        isPrivate: privacyMode !== "PUBLIC"
      }
    });

    logger.info(`Privacy mode updated for user ${userId}: ${privacyMode}`);
    return { success: true, user };
  } catch (error) {
    logger.error("Error updating privacy mode", { userId, error });
    return { success: false, error: "Failed to update privacy mode" };
  }
}

/**
 * Check if a profile is visible to a viewer
 * Rules:
 * - PUBLIC: visible to everyone (unless blocked)
 * - PRIVATE: visible only to contacts
 * - SEMI_PRIVATE: visible to contacts + followers
 */
export async function isProfileVisible(
  profileOwnerId: string,
  viewerId: string
): Promise<boolean> {
  // User can always see their own profile
  if (profileOwnerId === viewerId) {
    return true;
  }

  // Check if viewer is blocked
  const blocked = await isUserBlocked(profileOwnerId, viewerId);
  if (blocked) {
    return false;
  }

  // Get profile owner's privacy mode
  const user = await prisma.user.findUnique({
    where: { id: profileOwnerId },
    select: { privacyMode: true }
  });

  if (!user) {
    return false;
  }

  // PUBLIC profiles are always visible
  if (user.privacyMode === "PUBLIC") {
    return true;
  }

  // For PRIVATE and SEMI_PRIVATE, check contact status
  const contact = await isContact(profileOwnerId, viewerId);
  if (contact) {
    return true;
  }

  // For SEMI_PRIVATE, also check if viewer follows the user
  if (user.privacyMode === "SEMI_PRIVATE") {
    const follower = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: profileOwnerId
        }
      }
    });

    return !!follower;
  }

  return false;
}

/**
 * Check if a story is visible to a viewer
 * Depends on story visibility AND profile privacy mode
 */
export async function isStoryVisible(
  storyOwnerId: string,
  viewerId: string,
  storyVisibility: "PUBLIC" | "FOLLOWERS"
): Promise<boolean> {
  // User can always see their own stories
  if (storyOwnerId === viewerId) {
    return true;
  }

  // Check if viewer is blocked
  const blocked = await isUserBlocked(storyOwnerId, viewerId);
  if (blocked) {
    return false;
  }

  // Get story owner's privacy mode
  const user = await prisma.user.findUnique({
    where: { id: storyOwnerId },
    select: { privacyMode: true }
  });

  if (!user) {
    return false;
  }

  // PRIVATE users: only contacts can see stories
  if (user.privacyMode === "PRIVATE") {
    return await isContact(storyOwnerId, viewerId);
  }

  // PUBLIC users: depends on story visibility setting
  if (user.privacyMode === "PUBLIC") {
    if (storyVisibility === "PUBLIC") {
      return true;
    }

    // FOLLOWERS only: check if viewer follows the user
    if (storyVisibility === "FOLLOWERS") {
      const follower = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: storyOwnerId
          }
        }
      });

      return !!follower;
    }
  }

  // SEMI_PRIVATE users: contacts + followers can see public stories
  if (user.privacyMode === "SEMI_PRIVATE") {
    const contact = await isContact(storyOwnerId, viewerId);
    if (contact) {
      return true;
    }

    if (storyVisibility === "PUBLIC") {
      const follower = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: storyOwnerId
          }
        }
      });

      return !!follower;
    }
  }

  return false;
}

/**
 * Check if user can message another user
 * Applies privacy settings and contact rules
 */
export async function canUserMessage(
  senderId: string,
  recipientId: string
): Promise<{ canMessage: boolean; reason?: string }> {
  // Check if sender is blocked
  const senderBlocked = await isUserBlocked(recipientId, senderId);
  if (senderBlocked) {
    return { canMessage: false, reason: "You are blocked by this user" };
  }

  // Check if recipient blocked sender
  const recipientBlocked = await isUserBlocked(senderId, recipientId);
  if (recipientBlocked) {
    return { canMessage: false, reason: "You have blocked this user" };
  }

  // Get recipient's privacy mode
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { privacyMode: true }
  });

  if (!recipient) {
    return { canMessage: false, reason: "User not found" };
  }

  // PUBLIC users: anyone can message
  if (recipient.privacyMode === "PUBLIC") {
    return { canMessage: true };
  }

  // PRIVATE users: only contacts can message
  if (recipient.privacyMode === "PRIVATE") {
    const contact = await isContact(recipientId, senderId);
    if (!contact) {
      return { canMessage: false, reason: "User only accepts messages from contacts" };
    }
  }

  // SEMI_PRIVATE users: contacts + followers can message
  if (recipient.privacyMode === "SEMI_PRIVATE") {
    const contact = await isContact(recipientId, senderId);
    if (contact) {
      return { canMessage: true };
    }

    const follower = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: senderId,
          followingId: recipientId
        }
      }
    });

    if (!follower) {
      return { canMessage: false, reason: "You must be a contact or follower to message this user" };
    }
  }

  return { canMessage: true };
}

/**
 * Get list of users whose profiles are visible to viewer
 */
export async function getVisibleProfiles(viewerId: string, limit: number = 20) {
  try {
    // Get all PUBLIC profiles
    const publicProfiles = await prisma.user.findMany({
      where: {
        privacyMode: "PUBLIC",
        id: { not: viewerId }
      },
      take: limit,
      include: {
        profile: true,
        _count: {
          select: { followers: true }
        }
      }
    });

    // Get contacts' profiles
    const contactIds = await prisma.contact.findMany({
      where: { userId: viewerId, blockedAt: null },
      select: { contactUserId: true }
    });

    const contactProfiles = await prisma.user.findMany({
      where: {
        id: {
          in: contactIds.map((c) => c.contactUserId).filter(Boolean) as string[]
        }
      },
      include: {
        profile: true,
        _count: {
          select: { followers: true }
        }
      }
    });

    // Combine and remove duplicates
    const allProfiles = [...publicProfiles, ...contactProfiles];
    const seen = new Set<string>();
    return allProfiles.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  } catch (error) {
    logger.error("Error getting visible profiles", { viewerId, error });
    return [];
  }
}
