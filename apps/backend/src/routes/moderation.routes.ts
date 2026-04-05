import { Router } from "express";
import { adminStats, reportUser, reviewMessages, suspiciousUsers } from "../controllers/moderation.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";
import { adminGuard } from "../middleware/admin";

const router = Router();

router.post("/report", authGuard, csrfGuard, reportUser);
router.get("/admin/stats", authGuard, adminGuard, adminStats);
router.get("/admin/suspicious-users", authGuard, adminGuard, suspiciousUsers);
router.get("/admin/review-messages", authGuard, adminGuard, reviewMessages);

export default router;
