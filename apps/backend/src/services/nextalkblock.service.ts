import { prisma } from "../config/nextalkdb";
import { logger } from "../utils/nextalklogger";

/**
 * Block a user
 */
export async function blockUser(blockingUserId: string, blockedUserId: string, reason?: string) {
  if (blockingUserId === blockedUserId) {
    return { success: false, error: "Cannot block yourself" };
  }

  try {
    // Check if already blocked
    const existing = await prisma.block.findUnique({
      where: {
        blockingUserId_blockedUserId: {
          blockingUserId,
          blockedUserId
        }
      }
    });

    if (existing) {
      return { success: false, error: "User is already blocked" };
    }

    // Create block
    const block = await prisma.block.create({
      data: {
        blockingUserId,
        blockedUserId,
        reason
      }
    });

    logger.info(`User ${blockingUserId} blocked user ${blockedUserId}`);
    return { success: true, block };
  } catch (error) {
    logger.error("Error blocking user", { blockingUserId, blockedUserId, error });
    return { success: false, error: "Failed to block user" };
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(blockingUserId: string, blockedUserId: string) {
  try {
    await prisma.block.delete({
      where: {
        blockingUserId_blockedUserId: {
          blockingUserId,
          blockedUserId
        }
      }
    });

    logger.info(`User ${blockingUserId} unblocked user ${blockedUserId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error unblocking user", { blockingUserId, blockedUserId, error });
    return { success: false, error: "Failed to unblock user" };
  }
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(blockingUserId: string, blockedUserId: string): Promise<boolean> {
  const block = await prisma.block.findUnique({
    where: {
      blockingUserId_blockedUserId: {
        blockingUserId,
        blockedUserId
      }
    }
  });

  return !!block;
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(userId: string) {
  try {
    const blocks = await prisma.block.findMany({
      where: { blockingUserId: userId },
      include: {
        blockedUser: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true
              }
            }
          }
        }
      }
    });

    return blocks;
  } catch (error) {
    logger.error("Error getting blocked users", { userId, error });
    return [];
  }
}

/**
 * Get list of users who blocked this user
 */
export async function getUsersBlockingMe(userId: string) {
  try {
    const blocks = await prisma.block.findMany({
      where: { blockedUserId: userId },
      include: {
        blockingUser: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true
              }
            }
          }
        }
      }
    });

    return blocks;
  } catch (error) {
    logger.error("Error getting users blocking me", { userId, error });
    return [];
  }
}
