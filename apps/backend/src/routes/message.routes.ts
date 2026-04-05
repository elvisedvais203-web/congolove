import { Router } from "express";
import { createMessage, listMessages, markRead } from "../controllers/message.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";
import { messageLimiter } from "../middleware/security";

const router = Router();

router.get("/", authGuard, listMessages);
router.post("/", authGuard, csrfGuard, messageLimiter, createMessage);
router.post("/read", authGuard, csrfGuard, markRead);

export default router;
