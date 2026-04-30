import { Router } from "express";
import { compatibility, discovery, doSwipe } from "../controllers/nextalkmatching.controller";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";

const router = Router();

router.get("/discover", authGuard, discovery);
router.get("/compatibility/:targetUserId", authGuard, compatibility);
router.post("/swipe", authGuard, csrfGuard, doSwipe);

export default router;
