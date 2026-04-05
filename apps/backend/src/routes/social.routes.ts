import { Router } from "express";
import { follow, network, suggestions, unfollow } from "../controllers/social.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";

const router = Router();

router.get("/network", authGuard, network);
router.get("/suggestions", authGuard, suggestions);
router.post("/follow", authGuard, csrfGuard, follow);
router.post("/unfollow", authGuard, csrfGuard, unfollow);

export default router;
