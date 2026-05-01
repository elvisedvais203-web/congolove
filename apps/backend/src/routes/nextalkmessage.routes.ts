import { Router } from "express";
import { createMessage, listMessages, markRead } from "../controllers/nextalkmessage.controller";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import { messageLimiter } from "../middleware/nextalksecurity";

const router = Router();

router.get("/", authGuard, listMessages);
router.post("/", authGuard, csrfGuard, messageLimiter, createMessage);
router.post("/read", authGuard, csrfGuard, markRead);

export default router;
