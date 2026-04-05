import { Router } from "express";
import { discovery, doSwipe } from "../controllers/matching.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";

const router = Router();

router.get("/discover", authGuard, discovery);
router.post("/swipe", authGuard, csrfGuard, doSwipe);

export default router;
