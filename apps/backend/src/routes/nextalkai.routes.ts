import { Router } from "express";
import { aiIcebreakers, aiRecommendations, updateAiPreferences } from "../controllers/nextalkai.controller";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";

const router = Router();

router.post("/preferences", authGuard, csrfGuard, updateAiPreferences);
router.post("/recommendations", authGuard, aiRecommendations);
router.post("/icebreakers", authGuard, aiIcebreakers);

export default router;
