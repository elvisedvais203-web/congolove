import { Router } from "express";
import { login, refresh, register, sendPhoneOtp, verifyPhoneOtp } from "../controllers/auth.controller";
import { authLimiter } from "../middleware/security";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/otp/send", authLimiter, sendPhoneOtp);
router.post("/otp/verify", authLimiter, verifyPhoneOtp);
router.post("/refresh", authLimiter, refresh);

export default router;
