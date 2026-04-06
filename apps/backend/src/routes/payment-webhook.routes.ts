import { Router } from "express";
import { paymentWebhook } from "../controllers/payment-webhook.controller";

const router = Router();

router.post("/mobile-money", paymentWebhook);

export default router;
