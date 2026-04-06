import { Router } from "express";
import { callbackAppleOAuth, callbackGoogleOAuth, doResetPassword, forgotPassword, login, prepareOAuth, refresh, register, sendPhoneOtp, socialLogin, startAppleOAuth, startGoogleOAuth, verifyPhoneOtp } from "../controllers/auth.controller";
import { authLimiter } from "../middleware/security";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/otp/send", authLimiter, sendPhoneOtp);
router.post("/otp/verify", authLimiter, verifyPhoneOtp);
router.post("/refresh", authLimiter, refresh);
router.post("/social", authLimiter, socialLogin);
router.get("/oauth/:provider/prepare", prepareOAuth);
router.get("/oauth/google/start", startGoogleOAuth);
router.get("/oauth/google/callback", callbackGoogleOAuth);
router.get("/oauth/apple/start", startAppleOAuth);
router.post("/oauth/apple/callback", callbackAppleOAuth);
router.get("/oauth/apple/callback", callbackAppleOAuth);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, doResetPassword);

export default router;
