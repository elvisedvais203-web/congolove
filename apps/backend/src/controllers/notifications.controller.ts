import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ApiError } from "../utils/ApiError";
import { listPushTokens, registerPushToken, removePushToken } from "../services/push.service";
import { writeAuditLog } from "../services/audit.service";

export async function subscribePush(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const token = String(req.body?.token ?? "").trim();
  if (!token || token.length < 12) {
    throw new ApiError(400, "Token push invalide.");
  }

  await registerPushToken(userId, token);
  await writeAuditLog({
    userId,
    action: "PUSH_SUBSCRIBE",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 201,
    metadata: { tokenPreview: token.slice(0, 12) }
  });

  res.status(201).json({ ok: true });
}

export async function unsubscribePush(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const token = String(req.body?.token ?? "").trim();
  if (!token) {
    throw new ApiError(400, "Token push requis.");
  }

  await removePushToken(userId, token);
  await writeAuditLog({
    userId,
    action: "PUSH_UNSUBSCRIBE",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 200,
    metadata: { tokenPreview: token.slice(0, 12) }
  });

  res.json({ ok: true });
}

export async function myPushTokens(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const tokens = await listPushTokens(userId);
  res.json({
    count: tokens.length,
    tokens: tokens.map((token) => `${token.slice(0, 14)}...`)
  });
}
