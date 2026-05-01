import { prisma } from "../config/nextalkdb";
import { redis } from "../config/nextalkredis";
import { logger } from "../utils/nextalklogger";

const SEARCH_CACHE_TTL = 300; // 5 minutes

/**
 * Search for users with username priority
 * Returns users sorted by username match quality
 */
export async function searchUsers(query: string, limit: number = 20, currentUserId?: string) {
  if (query.length < 2) {
    return [];
  }

  try {
    const normalized = query.toLowerCase().trim();
    const cacheKey = `search:users:${normalized}:${limit}`;

    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Search by username first (exact start match)
    const usernameMatches = await prisma.user.findMany({
      where: {
        usernameSearchLower: {
          startsWith: normalized
        }
      },
      take: limit,
      select: {
        id: true,
        username: true,
        reputation: true,
        privacyMode: true,
        profile: {
          select: {
            displayName: true,
            bio: true
          }
        },
        _count: {
          select: {
            followers: true
          }
        }
      }
    });

    // Search by display name if needed
    let displayNameMatches: any[] = [];
    if (usernameMatches.length < limit) {
      displayNameMatches = await prisma.user.findMany({
        where: {
          profile: {
            displayName: {
              contains: query,
              mode: "insensitive"
            }
          },
          id: {
            notIn: usernameMatches.map((u) => u.id)
          }
        },
        take: limit - usernameMatches.length,
        select: {
          id: true,
          username: true,
          reputation: true,
          privacyMode: true,
          profile: {
            select: {
              displayName: true,
              bio: true
            }
          },
          _count: {
            select: {
              followers: true
            }
          }
        }
      });
    }

    const results = [...usernameMatches, ...displayNameMatches].slice(0, limit);

    // Cache the results
    await redis.setex(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(results));

    return results;
  } catch (error) {
    logger.error("Error searching users", { query, error });
    return [];
  }
}

/**
 * Get trending users (most followed recently)
 */
export async function getTrendingUsers(limit: number = 20) {
  try {
    const cacheKey = "trending:users";

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get users with most followers added in last 30 days
    const trending = await prisma.user.findMany({
      where: {
        privacyMode: "PUBLIC", // Only public users appear in trending
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      take: limit,
      orderBy: {
        followers: {
          _count: "desc"
        }
      },
      select: {
        id: true,
        username: true,
        reputation: true,
        profile: {
          select: {
            displayName: true,
            bio: true
          }
        },
        _count: {
          select: {
            followers: true
          }
        }
      }
    });

    // Cache for longer (1 hour)
    await redis.setex(cacheKey, 3600, JSON.stringify(trending));

    return trending;
  } catch (error) {
    logger.error("Error getting trending users", { error });
    return [];
  }
}

/**
 * Search users by interests
 */
export async function searchByInterests(interests: string[], limit: number = 20) {
  try {
    const results = await prisma.user.findMany({
      where: {
        profile: {
          interests: {
            hasSome: interests
          }
        },
        privacyMode: "PUBLIC"
      },
      take: limit,
      select: {
        id: true,
        username: true,
        reputation: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
            interests: true
          }
        },
        _count: {
          select: {
            followers: true
          }
        }
      }
    });

    return results;
  } catch (error) {
    logger.error("Error searching by interests", { interests, error });
    return [];
  }
}

/**
 * Get suggested users for discovery
 */
export async function getSuggestedUsers(currentUserId: string, limit: number = 20) {
  try {
    // Get users that the current user is not following and not matched with
    const suggestions = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        privacyMode: "PUBLIC",
        followers: {
          none: {
            followerId: currentUserId
          }
        },
        matchesAsA: {
          none: {
            userBId: currentUserId
          }
        },
        matchesAsB: {
          none: {
            userAId: currentUserId
          }
        }
      },
      take: limit,
      orderBy: {
        reputation: "desc"
      },
      select: {
        id: true,
        username: true,
        reputation: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
            interests: true
          }
        },
        _count: {
          select: {
            followers: true
          }
        }
      }
    });

    return suggestions;
  } catch (error) {
    logger.error("Error getting suggested users", { currentUserId, error });
    return [];
  }
}

/**
 * Invalidate user search cache
 */
export async function invalidateUserSearchCache(userId: string) {
  try {
    // Invalidate trending cache when a new user is added
    await redis.del("trending:users");
    logger.info(`Invalidated search cache for user ${userId}`);
  } catch (error) {
    logger.error("Error invalidating search cache", { error });
  }
}
