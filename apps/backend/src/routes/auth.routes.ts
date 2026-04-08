import { Router } from "express";
import { loginWithFirebase, refresh } from "../controllers/auth.controller";
import { authLimiter } from "../middleware/security";

const router = Router();

router.post("/firebase/verify", authLimiter, loginWithFirebase);
router.post("/refresh", authLimiter, refresh);

export default router;
