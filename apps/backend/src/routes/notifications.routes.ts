import { Router } from "express";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";
import { myPushTokens, subscribePush, unsubscribePush } from "../controllers/notifications.controller";

const router = Router();

router.get("/push/tokens", authGuard, myPushTokens);
router.post("/push/subscribe", authGuard, csrfGuard, subscribePush);
router.delete("/push/subscribe", authGuard, csrfGuard, unsubscribePush);

export default router;
