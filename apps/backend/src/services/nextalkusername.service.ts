import { prisma } from "../config/nextalkdb";
import { logger } from "../utils/nextalklogger";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;
const RESERVED_USERNAMES = [
  "admin", "system", "root", "support", "help", "test", 
  "api", "app", "bot", "official", "nexttalk", "nextalk", 
  "nextalk", "next", "talk", "admin", "superadmin"
];

/**
 * Validates username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: `Username must be at most ${USERNAME_MAX_LENGTH} characters` };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, dots, hyphens, and underscores" };
  }

  if (RESERVED_USERNAMES.includes(trimmed.toLowerCase())) {
    return { valid: false, error: "This username is reserved and cannot be used" };
  }

  return { valid: true };
}

/**
 * Normalize username for storage (lowercase for search)
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Check if username is available (not taken)
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  
  const existing = await prisma.user.findFirst({
    where: {
      usernameSearchLower: normalized
    }
  });

  return !existing;
}

/**
 * Claim/set a username for a user
 */
export async function claimUsername(userId: string, username: string): Promise<{ success: boolean; error?: string }> {
  const validation = validateUsername(username);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const normalized = normalizeUsername(username);
  const isAvailable = await checkUsernameAvailability(username);

  if (!isAvailable) {
    return { success: false, error: "Username is already taken" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        username: username.trim(),
        usernameSearchLower: normalized
      }
    });

    logger.info(`Username claimed: ${username} for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error claiming username", { userId, username, error });
    return { success: false, error: "Failed to claim username" };
  }
}

/**
 * Get user profile by username
 */
export async function getUserByUsername(username: string, currentUserId?: string) {
  const normalized = normalizeUsername(username);

  const user = await prisma.user.findFirst({
    where: {
      usernameSearchLower: normalized
    },
    include: {
      profile: true,
      _count: {
        select: {
          followers: true,
          following: true,
          stories: true
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  // Check if requestor is blocked
  if (currentUserId && currentUserId !== user.id) {
    const isBlocked = await prisma.block.findUnique({
      where: {
        blockingUserId_blockedUserId: {
          blockingUserId: user.id,
          blockedUserId: currentUserId
        }
      }
    });

    if (isBlocked) {
      return null; // User is blocked, don't return profile
    }
  }

  return user;
}

/**
 * Search usernames with suggestions
 */
export async function searchUsernames(query: string, limit: number = 10) {
  if (query.length < 2) {
    return [];
  }

  const normalized = normalizeUsername(query);

  const users = await prisma.user.findMany({
    where: {
      usernameSearchLower: {
        startsWith: normalized
      }
    },
    take: limit,
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          displayName: true
        }
      },
      _count: {
        select: {
          followers: true
        }
      }
    }
  });

  return users;
}

/**
 * Update user privacy mode
 */
export async function updateUserPrivacyMode(userId: string, privacyMode: string) {
  if (!["PUBLIC", "PRIVATE", "SEMI_PRIVATE"].includes(privacyMode)) {
    return { success: false, error: "Invalid privacy mode" };
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { privacyMode: privacyMode as any }
    });

    return { success: true, user };
  } catch (error) {
    logger.error("Error updating privacy mode", { userId, error });
    return { success: false, error: "Failed to update privacy mode" };
  }
}

/**
 * Check if user profile is visible to another user
 */
export async function isUserProfileVisible(userId: string, viewerId: string): Promise<boolean> {
  // User can always see their own profile
  if (userId === viewerId) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { privacyMode: true }
  });

  if (!user) {
    return false;
  }

  // PUBLIC users are always visible
  if (user.privacyMode === "PUBLIC") {
    return true;
  }

  // For PRIVATE and SEMI_PRIVATE, check if viewer is a contact
  if (user.privacyMode === "PRIVATE" || user.privacyMode === "SEMI_PRIVATE") {
    const contact = await prisma.contact.findFirst({
      where: {
        userId,
        contactUserId: viewerId,
        blockedAt: null
      }
    });

    return !!contact;
  }

  return false;
}
