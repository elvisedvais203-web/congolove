import { prisma } from "../config/db";
import { paymentProviderFactory } from "./payment.providers";

interface PremiumPaymentInput {
  userId: string;
  provider: string;
  phone: string;
  amountCdf: number;
  purpose: "PREMIUM_SUBSCRIPTION" | "PROFILE_BOOST";
}

export async function processPremiumPayment(input: PremiumPaymentInput) {
  const externalRef = `PAY_${Date.now()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      amountCdf: input.amountCdf,
      purpose: input.purpose,
      status: "PENDING",
      externalRef
    }
  });

  const provider = paymentProviderFactory(input.provider);
  const result = await provider.pay({
    amountCdf: input.amountCdf,
    phone: input.phone,
    externalRef
  });

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: result.status,
      processedAt: new Date()
    }
  });

  if (result.success && input.purpose === "PREMIUM_SUBSCRIPTION") {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    await prisma.subscription.create({
      data: {
        userId: input.userId,
        expiresAt: expiry,
        active: true
      }
    });

    await prisma.user.update({
      where: { id: input.userId },
      data: { planTier: "PREMIUM" }
    });
  }

  return updated;
}
