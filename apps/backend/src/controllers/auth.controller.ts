import { Request, Response } from "express";
import { confirmUserIdentity, loginUser, refreshTokens, registerUser } from "../services/auth.service";
import { sendOtp, verifyOtp } from "../services/otp.service";
import { normalizeRdcPhone } from "../utils/phone";
import { ApiError } from "../utils/ApiError";

function resolveIdentifier(payload: { phone?: string; email?: string; identifier?: string }): string {
  const rawIdentifier = String(payload.identifier ?? payload.email ?? payload.phone ?? "").trim();
  if (!rawIdentifier) {
    throw new ApiError(400, "Email ou numero requis");
  }

  return rawIdentifier.includes("@") ? rawIdentifier.toLowerCase() : normalizeRdcPhone(rawIdentifier);
}

export async function register(req: Request, res: Response) {
  const { user } = await registerUser(req.body);
  const identifier = user.email ?? user.phone;
  const otp = await sendOtp(identifier);

  res.status(201).json({
    user,
    verificationRequired: true,
    otp
  });
}

export async function login(req: Request, res: Response) {
  const data = await loginUser(req.body);
  res.json(data);
}

export async function sendPhoneOtp(req: Request, res: Response) {
  const identifier = resolveIdentifier(req.body as { phone?: string; email?: string; identifier?: string });
  const result = await sendOtp(identifier);
  res.json(result);
}

export async function verifyPhoneOtp(req: Request, res: Response) {
  const { code } = req.body as { code: string };
  const identifier = resolveIdentifier(req.body as { phone?: string; email?: string; identifier?: string });
  const valid = await verifyOtp(identifier, code);
  if (!valid) {
    res.status(400).json({ valid: false, message: "Code OTP invalide ou expire" });
    return;
  }

  const confirmation = await confirmUserIdentity({ identifier });
  res.json({ valid: true, confirmed: true, alreadyVerified: confirmation.alreadyVerified });
}

export function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const payload = refreshTokens(refreshToken);
  res.json(payload);
}
