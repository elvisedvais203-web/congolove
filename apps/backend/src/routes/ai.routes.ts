import { Router } from "express";
import { aiIcebreakers, aiRecommendations, updateAiPreferences } from "../controllers/ai.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";

const router = Router();

router.post("/preferences", authGuard, csrfGuard, updateAiPreferences);
router.post("/recommendations", authGuard, aiRecommendations);
router.post("/icebreakers", authGuard, aiIcebreakers);

export default router;
