import { Router } from "express";
import { loginWithFirebase, refresh } from "../controllers/nextalkauth.controller";
import { authLimiter } from "../middleware/nextalksecurity";

const router = Router();

router.post("/firebase/verify", authLimiter, loginWithFirebase);
router.post("/refresh", authLimiter, refresh);

export default router;
