import { Request, Response } from "express";
import { confirmUserIdentity, loginOrRegisterWithSocial, loginUser, refreshTokens, registerUser, resetPassword } from "../services/auth.service";
import { buildOAuthErrorRedirect, completeAppleOAuth, completeGoogleOAuth, getAppleOAuthStartUrl, getGoogleOAuthStartUrl } from "../services/oauth.service";
import { sendOtp, verifyOtp } from "../services/otp.service";
import { normalizeInternationalPhone } from "../utils/phone";
import { ApiError } from "../utils/ApiError";

function resolveIdentifier(payload: { phone?: string; email?: string; identifier?: string }): string {
  const rawIdentifier = String(payload.identifier ?? payload.email ?? payload.phone ?? "").trim();
  if (!rawIdentifier) {
    throw new ApiError(400, "Email ou numero requis");
  }

  return rawIdentifier.includes("@") ? rawIdentifier.toLowerCase() : normalizeInternationalPhone(rawIdentifier);
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

export async function forgotPassword(req: Request, res: Response) {
  const identifier = resolveIdentifier(req.body as { phone?: string; email?: string; identifier?: string });
  const result = await sendOtp(identifier);
  res.json(result);
}

export async function doResetPassword(req: Request, res: Response) {
  const { code, newPassword } = req.body as { code: string; newPassword: string };
  const identifier = resolveIdentifier(req.body as { phone?: string; email?: string; identifier?: string });
  const valid = await verifyOtp(identifier, code);
  if (!valid) {
    res.status(400).json({ valid: false, message: "Code OTP invalide ou expire" });
    return;
  }
  await resetPassword({ identifier, newPassword });
  res.json({ success: true, message: "Mot de passe reinitialise avec succes" });
}

export function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const payload = refreshTokens(refreshToken);
  res.json(payload);
}

export async function socialLogin(req: Request, res: Response) {
  const { provider, email, displayName } = req.body as { provider?: "google" | "apple"; email?: string; displayName?: string };
  const result = await loginOrRegisterWithSocial({ provider, email, displayName });
  res.json(result);
}

export function prepareOAuth(req: Request, res: Response) {
  const provider = String(req.params.provider ?? "").toLowerCase();
  if (provider !== "google" && provider !== "apple") {
    res.status(400).json({ configured: false, message: "Provider OAuth invalide." });
    return;
  }

  try {
    const url = provider === "google" ? getGoogleOAuthStartUrl() : getAppleOAuthStartUrl();
    res.json({ configured: true, url, provider });
  } catch (error: any) {
    res.json({
      configured: false,
      provider,
      message: String(error?.message ?? "OAuth non configure")
    });
  }
}

export function startGoogleOAuth(_req: Request, res: Response) {
  try {
    const url = getGoogleOAuthStartUrl();
    res.redirect(url);
  } catch (error: any) {
    const redirectUrl = buildOAuthErrorRedirect(String(error?.message ?? "Configuration OAuth Google manquante"), "google");
    res.redirect(redirectUrl);
  }
}

export async function callbackGoogleOAuth(req: Request, res: Response) {
  try {
    const code = String(req.query.code ?? "").trim();
    const state = String(req.query.state ?? "").trim();
    const redirectUrl = await completeGoogleOAuth(code, state);
    res.redirect(redirectUrl);
  } catch (error: any) {
    const redirectUrl = buildOAuthErrorRedirect(String(error?.message ?? "Connexion Google impossible"), "google");
    res.redirect(redirectUrl);
  }
}

export function startAppleOAuth(_req: Request, res: Response) {
  try {
    const url = getAppleOAuthStartUrl();
    res.redirect(url);
  } catch (error: any) {
    const redirectUrl = buildOAuthErrorRedirect(String(error?.message ?? "Configuration OAuth Apple manquante"), "apple");
    res.redirect(redirectUrl);
  }
}

export async function callbackAppleOAuth(req: Request, res: Response) {
  try {
    const code = String(req.body?.code ?? req.query.code ?? "").trim();
    const state = String(req.body?.state ?? req.query.state ?? "").trim();
    const idToken = String(req.body?.id_token ?? req.query.id_token ?? "").trim();
    const user = req.body?.user ? String(req.body.user) : undefined;
    const redirectUrl = await completeAppleOAuth({ code, state, idToken, user });
    res.redirect(redirectUrl);
  } catch (error: any) {
    const redirectUrl = buildOAuthErrorRedirect(String(error?.message ?? "Connexion Apple impossible"), "apple");
    res.redirect(redirectUrl);
  }
}
