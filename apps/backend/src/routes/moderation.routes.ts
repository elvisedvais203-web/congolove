import { Router } from "express";
import { adminAppeals, adminReports, adminRestrictions, adminStats, adminUsers, reportUser, resolveAppeal, reviewMessages, reviewVerification, submitAppeal, suspiciousUsers, updateAccountRestriction } from "../controllers/moderation.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";
import { adminGuard } from "../middleware/admin";
import { authLimiter } from "../middleware/security";

const router = Router();

router.post("/report", authGuard, csrfGuard, reportUser);
router.post("/appeal", authLimiter, submitAppeal);
router.get("/admin/stats", authGuard, adminGuard, adminStats);
router.get("/admin/users", authGuard, adminGuard, adminUsers);
router.post("/admin/users/:userId/restriction", authGuard, adminGuard, csrfGuard, updateAccountRestriction);
router.get("/admin/restrictions", authGuard, adminGuard, adminRestrictions);
router.get("/admin/appeals", authGuard, adminGuard, adminAppeals);
router.post("/admin/appeals/:appealId/resolve", authGuard, adminGuard, csrfGuard, resolveAppeal);
router.get("/admin/reports", authGuard, adminGuard, adminReports);
router.get("/admin/suspicious-users", authGuard, adminGuard, suspiciousUsers);
router.get("/admin/review-messages", authGuard, adminGuard, reviewMessages);
router.post("/admin/users/:userId/review-verification", authGuard, adminGuard, csrfGuard, reviewVerification);

export default router;
