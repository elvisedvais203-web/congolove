import { Request, Response } from "express";
import {
  loginOrRegisterWithFirebasePhone,
  refreshTokens,
  loginWithEmailPassword,
  registerWithEmailPassword,
  requestPasswordReset,
  resetPassword
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

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const data = await refreshTokens(refreshToken);
  res.json(data);
}

export async function registerEmail(req: Request, res: Response) {
  const { email, password, displayName } = req.body as { email?: string; password?: string; displayName?: string };
  const data = await registerWithEmailPassword({
    email: String(email ?? ""),
    password: String(password ?? ""),
    displayName,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  });
  res.json(data);
}

export async function loginEmail(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };
  const data = await loginWithEmailPassword({
    email: String(email ?? ""),
    password: String(password ?? ""),
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  });
  res.json(data);
}

export async function requestReset(req: Request, res: Response) {
  const { email } = req.body as { email?: string };
  const data = await requestPasswordReset({ email: String(email ?? "") });
  res.json(data);
}

export async function reset(req: Request, res: Response) {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  const data = await resetPassword({ token: String(token ?? ""), newPassword: String(newPassword ?? "") });
  res.json(data);
}
