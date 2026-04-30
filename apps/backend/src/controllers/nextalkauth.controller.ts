import { Request, Response } from "express";
import {
  loginOrRegisterWithFirebasePhone,
  refreshTokens
} from "../services/nextalkauth.service";
import { verifyFirebaseIdToken } from "../services/nextalkfirebase-admin.service";

export async function loginWithFirebase(req: Request, res: Response) {
  const { idToken, displayName } = req.body as { idToken?: string; displayName?: string };

  const decoded = await verifyFirebaseIdToken(String(idToken ?? ""));
  const data = await loginOrRegisterWithFirebasePhone({
    firebaseUid: decoded.uid,
    phoneNumber: decoded.phoneNumber,
    displayName,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  });

  res.json(data);
}

export function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const payload = refreshTokens(refreshToken);
  res.json(payload);
}
