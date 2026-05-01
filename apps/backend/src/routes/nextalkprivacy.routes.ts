import { Router, Request, Response } from "express";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import {
  getUserPrivacySettings,
  updatePrivacyMode,
  isProfileVisible,
  isStoryVisible,
  canUserMessage,
  getVisibleProfiles,
  type PrivacyMode
} from "../services/nextalkprivacy.service";
import { ApiError } from "../utils/nextalkapierror";

const router = Router();

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * Get user's privacy settings
 * GET /api/privacy/settings
 */
router.get("/settings", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const settings = await getUserPrivacySettings(userId);

    if (!settings) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      privacyMode: settings.privacyMode,
      profile: settings.profile
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update privacy mode
 * PUT /api/privacy/mode
 */
router.put("/mode", authGuard, csrfGuard, async (req: AuthRequest, res, next) => {
  try {
    const { privacyMode } = req.body;
    const userId = req.userId!;

    if (!privacyMode) {
      throw new ApiError(400, "privacyMode is required");
    }

    const result = await updatePrivacyMode(userId, privacyMode as PrivacyMode);

    if (!result.success) {
      throw new ApiError(400, result.error || "Failed to update privacy mode");
    }

    res.json({
      message: "Privacy mode updated successfully",
      privacyMode
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check if profile is visible to viewer
 * GET /api/privacy/profile-visible/:userId
 */
router.get("/profile-visible/:userId", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const { userId: targetUserId } = req.params;
    const viewerId = req.userId!;

    const visible = await isProfileVisible(targetUserId as string, viewerId);

    res.json({
      profileOwnerId: targetUserId,
      viewerId,
      visible
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check if story is visible to viewer
 * GET /api/privacy/story-visible/:storyId
 */
router.get("/story-visible/:storyOwnerId", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const { storyOwnerId } = req.params;
    const { storyVisibility = "PUBLIC" } = req.query;
    const viewerId = req.userId!;

    const visible = await isStoryVisible(storyOwnerId as string, viewerId, storyVisibility as "PUBLIC" | "FOLLOWERS");

    res.json({
      storyOwnerId,
      viewerId,
      storyVisibility,
      visible
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check if user can message another user
 * POST /api/privacy/can-message
 */
router.post("/can-message", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.userId!;

    if (!recipientId) {
      throw new ApiError(400, "recipientId is required");
    }

    const result = await canUserMessage(senderId, recipientId);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Get visible profiles to current user
 * GET /api/privacy/visible-profiles
 */
router.get("/visible-profiles", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const viewerId = req.userId!;
    const { limit = "20" } = req.query;

    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const profiles = await getVisibleProfiles(viewerId, limitNum);

    res.json({
      count: profiles.length,
      profiles
    });
  } catch (error) {
    next(error);
  }
});

export default router;
