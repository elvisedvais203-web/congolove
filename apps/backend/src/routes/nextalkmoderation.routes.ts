import { Router } from "express";
import { adminAppeals, adminReports, adminRestrictions, adminStats, adminUsers, reportUser, resolveAppeal, reviewMessages, reviewVerification, submitAppeal, suspiciousUsers, updateAccountRestriction } from "../controllers/nextalkmoderation.controller";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import { adminGuard } from "../middleware/nextalkadmin";
import { authLimiter } from "../middleware/nextalksecurity";

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
