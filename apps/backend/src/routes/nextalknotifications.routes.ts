import { Router } from "express";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import { myPushTokens, subscribePush, unsubscribePush } from "../controllers/nextalknotifications.controller";

const router = Router();

router.get("/push/tokens", authGuard, myPushTokens);
router.post("/push/subscribe", authGuard, csrfGuard, subscribePush);
router.delete("/push/subscribe", authGuard, csrfGuard, unsubscribePush);

export default router;
