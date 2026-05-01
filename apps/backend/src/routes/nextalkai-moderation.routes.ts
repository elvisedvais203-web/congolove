import { Router } from "express";
import {
  analyzeContentForModeration,
  getReviewQueue,
  assignReview,
  resolveReview,
  getUserBehaviorAnalysis,
  getModerationMetrics,
  bulkAnalyzeMessages
} from "../controllers/nextalkai-moderation.controller";
import { authGuard } from "../middleware/nextalkauth";
import { adminGuard } from "../middleware/nextalkadmin";
import { csrfGuard } from "../middleware/nextalkcsrf";

const router = Router();

/**
 * AI Moderation endpoints (admin only)
 */

router.post("/analyze", authGuard, adminGuard, csrfGuard, analyzeContentForModeration);

router.get("/queue", authGuard, adminGuard, getReviewQueue);
router.post("/review/:reviewId/assign", authGuard, adminGuard, csrfGuard, assignReview);
router.post("/review/:reviewId/resolve", authGuard, adminGuard, csrfGuard, resolveReview);

router.get("/user/:userId/behavior", authGuard, adminGuard, getUserBehaviorAnalysis);

router.get("/metrics", authGuard, adminGuard, getModerationMetrics);

router.post("/bulk-analyze", authGuard, adminGuard, csrfGuard, bulkAnalyzeMessages);

export default router;
