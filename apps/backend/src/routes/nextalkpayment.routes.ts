import { Router } from "express";
import { payPremium } from "../controllers/nextalkpayment.controller";
import { authGuard } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import { paymentLimiter } from "../middleware/nextalksecurity";

const router = Router();

router.post("/premium", authGuard, csrfGuard, paymentLimiter, payPremium);

export default router;
