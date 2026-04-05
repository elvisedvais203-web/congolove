import { Router } from "express";
import { myProfile, updateProfile } from "../controllers/profile.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";

const router = Router();

router.get("/me", authGuard, myProfile);
router.patch("/me", authGuard, csrfGuard, updateProfile);

export default router;
