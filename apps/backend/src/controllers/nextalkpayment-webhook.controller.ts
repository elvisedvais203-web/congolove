import { Request, Response } from "express";
import crypto from "node:crypto";
import { prisma } from "../config/nextalkdb";
import { redis } from "../config/nextalkredis";
import { env } from "../config/nextalkenv";
import { ApiError } from "../utils/nextalkapierror";
import { writeAuditLog } from "../services/nextalkaudit.service";

function statusFromProvider(raw: string): "PENDING" | "SUCCESS" | "FAILED" {
  const value = raw.trim().toUpperCase();
  if (value === "SUCCESS" || value === "SUCCEEDED" || value === "PAID") return "SUCCESS";
  if (value === "FAILED" || value === "FAIL" || value === "ERROR") return "FAILED";
  return "PENDING";
}

export async function paymentWebhook(req: Request, res: Response) {
  const signature = String(req.header("x-payment-signature") ?? "");
  const eventId = String(req.header("x-payment-event-id") ?? "").trim();
  const payloadString = JSON.stringify(req.body ?? {});

  const expected = crypto.createHmac("sha256", env.paymentWebhookSecret).update(payloadString).digest("hex");
  if (!signature || signature !== expected) {
    throw new ApiError(401, "Signature webhook invalide.");
  }

  if (!eventId) {
    throw new ApiError(400, "x-payment-event-id requis.");
  }

  const redisKey = `payment:webhook:event:${eventId}`;
  const inserted = await redis.set(redisKey, "1", "EX", 60 * 60 * 24, "NX");
  if (!inserted) {
    res.json({ ok: true, deduplicated: true });
    return;
  }

  const externalRef = String(req.body?.externalRef ?? "").trim();
  if (!externalRef) {
    throw new ApiError(400, "externalRef requis.");
  }

  const nextStatus = statusFromProvider(String(req.body?.status ?? "PENDING"));
  const providerTxId = String(req.body?.providerTxId ?? "").trim() || null;

  const payment = await prisma.payment.findFirst({ where: { externalRef } });
  if (!payment) {
    throw new ApiError(404, "Paiement introuvable pour cet externalRef.");
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: nextStatus,
      processedAt: new Date(),
      externalRef: providerTxId ?? payment.externalRef
    }
  });

  if (nextStatus === "SUCCESS" && payment.purpose === "PREMIUM_SUBSCRIPTION") {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    await prisma.subscription.create({
      data: {
        userId: payment.userId,
        expiresAt: expiry,
        active: true
      }
    });

    await prisma.user.update({ where: { id: payment.userId }, data: { planTier: "PREMIUM" } });
  }

  await writeAuditLog({
    userId: payment.userId,
    action: "PAYMENT_WEBHOOK_EVENT",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 200,
    metadata: {
      eventId,
      paymentId: payment.id,
      externalRef,
      providerTxId,
      status: nextStatus
    }
  });

  res.json({ ok: true, paymentId: payment.id, status: nextStatus });
}
