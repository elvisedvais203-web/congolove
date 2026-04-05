import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { processPremiumPayment } from "../services/payment.service";

export async function payPremium(req: AuthRequest, res: Response) {
  const { provider, phone, amountCdf, purpose } = req.body as {
    provider: string;
    phone: string;
    amountCdf: number;
    purpose: "PREMIUM_SUBSCRIPTION" | "PROFILE_BOOST";
  };

  const payment = await processPremiumPayment({
    userId: req.user!.userId,
    provider,
    phone,
    amountCdf,
    purpose
  });

  res.status(201).json(payment);
}
