import { Router } from "express";
import {
  loginEmail,
  loginWithFirebase,
  refresh,
  registerEmail,
  requestReset,
  reset
} from "../controllers/nextalkauth.controller";
import { authLimiter } from "../middleware/nextalksecurity";

const router = Router();

router.post("/firebase/verify", authLimiter, loginWithFirebase);
router.post("/refresh", authLimiter, refresh);
router.post("/email/register", authLimiter, registerEmail);
router.post("/email/login", authLimiter, loginEmail);
router.post("/password/request-reset", authLimiter, requestReset);
router.post("/password/reset", authLimiter, reset);

export default router;
