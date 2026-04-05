import { Router } from "express";
import { payPremium } from "../controllers/payment.controller";
import { authGuard } from "../middleware/auth";
import { csrfGuard } from "../middleware/csrf";
import { paymentLimiter } from "../middleware/security";

const router = Router();

router.post("/premium", authGuard, csrfGuard, paymentLimiter, payPremium);

export default router;
