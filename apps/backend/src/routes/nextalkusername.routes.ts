import { Router, Request, Response } from "express";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import {
  checkUsernameAvailability,
  claimUsername,
  getUserByUsername,
  searchUsernames,
  validateUsername
} from "../services/nextalkusername.service";
import { ApiError } from "../utils/nextalkapierror";

const router = Router();

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * Check if username is available
 * POST /api/username/check-availability
 */
router.post("/check-availability", async (req: AuthRequest, res, next) => {
  try {
    const { username } = req.body;

    if (!username) {
      throw new ApiError(400, "Username is required");
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      throw new ApiError(400, validation.error || "Invalid username");
    }

    const available = await checkUsernameAvailability(username);

    res.json({
      available,
      username: username.trim()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Claim a username for the current user
 * POST /api/username/claim
 */
router.post("/claim", authGuard, csrfGuard, async (req: AuthRequest, res, next) => {
  try {
    const { username } = req.body;
    const userId = req.userId!;

    if (!username) {
      throw new ApiError(400, "Username is required");
    }

    const result = await claimUsername(userId, username);

    if (!result.success) {
      throw new ApiError(400, result.error || "Failed to claim username");
    }

    res.json({
      message: "Username claimed successfully",
      username: username.trim()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get public profile by username
 * GET /api/username/:username
 */
router.get("/:username", async (req: AuthRequest, res, next) => {
  try {
    const { username } = req.params;
    const viewerId = req.userId; // Optional - for privacy checks

    const user = await getUserByUsername(username as string, viewerId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Return limited public profile data
    res.json({
      id: user.id,
      username: user.username,
      profile: user.profile,
      followerCount: user._count?.followers || 0,
      followingCount: user._count?.following || 0,
      storyCount: user._count?.stories || 0,
      reputation: user.reputation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Search for usernames
 * GET /api/username/search?q=query
 */
router.get("/search", async (req: AuthRequest, res, next) => {
  try {
    const { q, limit = "10" } = req.query;

    if (!q || typeof q !== "string") {
      throw new ApiError(400, "Search query is required");
    }

    const limitNum = Math.min(parseInt(limit as string, 10) || 10, 50);
    const results = await searchUsernames(q, limitNum);

    res.json({
      query: q,
      count: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
});

export default router;
