import { env } from "../config/env";
import { redis } from "../config/redis";
import nodemailer from "nodemailer";
import { ApiError } from "../utils/ApiError";

const OTP_PREFIX = "otp:";
const OTP_TTL_SECONDS = 300;
const OTP_COOLDOWN_SECONDS = 30;
const OTP_WINDOW_SECONDS = 15 * 60;
const OTP_MAX_SENDS_PER_WINDOW = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 6;
const memoryOtpStore = new Map<string, { code: string; expiresAt: number }>();

function normalizeOtpKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function cleanupExpiredMemoryOtps() {
  const now = Date.now();
  for (const [key, otp] of memoryOtpStore.entries()) {
    if (otp.expiresAt <= now) {
      memoryOtpStore.delete(key);
    }
  }
}

async function storeOtp(identifier: string, code: string): Promise<void> {
  const key = `${OTP_PREFIX}${normalizeOtpKey(identifier)}`;
  try {
    await redis.setex(key, OTP_TTL_SECONDS, code);
    await redis.del(`${OTP_PREFIX}attempts:${normalizeOtpKey(identifier)}`);
    return;
  } catch {
    memoryOtpStore.set(normalizeOtpKey(identifier), {
      code,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000
    });
  }
}

async function deleteOtp(identifier: string): Promise<void> {
  const key = `${OTP_PREFIX}${normalizeOtpKey(identifier)}`;
  try {
    await redis.del(key);
    await redis.del(`${OTP_PREFIX}attempts:${normalizeOtpKey(identifier)}`);
    return;
  } catch {
    memoryOtpStore.delete(normalizeOtpKey(identifier));
  }
}

async function getCooldownSeconds(identifier: string): Promise<number> {
  const key = `${OTP_PREFIX}cooldown:${normalizeOtpKey(identifier)}`;
  try {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  } catch {
    return 0;
  }
}

async function enforceOtpRateLimit(identifier: string): Promise<void> {
  const cooldown = await getCooldownSeconds(identifier);
  if (cooldown > 0) {
    throw new ApiError(429, `Veuillez patienter ${cooldown}s avant de renvoyer un code.`);
  }

  const key = `${OTP_PREFIX}limit:${normalizeOtpKey(identifier)}`;
  try {
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, OTP_WINDOW_SECONDS);
    }
    if (attempts > OTP_MAX_SENDS_PER_WINDOW) {
      throw new ApiError(429, "Trop de demandes OTP. Reessayez dans quelques minutes.");
    }
    await redis.setex(`${OTP_PREFIX}cooldown:${normalizeOtpKey(identifier)}`, OTP_COOLDOWN_SECONDS, "1");
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
  }
}

async function markVerifyFailure(identifier: string): Promise<void> {
  const key = `${OTP_PREFIX}attempts:${normalizeOtpKey(identifier)}`;
  try {
    const tries = await redis.incr(key);
    await redis.expire(key, OTP_TTL_SECONDS);
    if (tries >= OTP_MAX_VERIFY_ATTEMPTS) {
      await deleteOtp(identifier);
      throw new ApiError(429, "Trop de tentatives OTP. Demandez un nouveau code.");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
  }
}

async function readOtp(identifier: string): Promise<string | null> {
  const key = `${OTP_PREFIX}${normalizeOtpKey(identifier)}`;
  try {
    return await redis.get(key);
  } catch {
    cleanupExpiredMemoryOtps();
    const found = memoryOtpStore.get(normalizeOtpKey(identifier));
    return found?.code ?? null;
  }
}

function maskIdentifier(identifier: string): string {
  if (identifier.includes("@")) {
    const [local, domain] = identifier.split("@");
    const localMasked = local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}***`;
    return `${localMasked}@${domain}`;
  }

  return `${identifier.slice(0, 4)}******${identifier.slice(-2)}`;
}

function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes("@");
}

function buildOtpMessage(code: string, purpose: "VERIFY_ACCOUNT" | "LOGIN_2FA" | "RESET_PASSWORD"): { text: string; subject: string; html: string } {
  if (purpose === "LOGIN_2FA") {
    const text = `Connexion detectee. Code de securite KongoLove: ${code}. Expire dans 5 minutes.`;
    const subject = "Alerte securite connexion";
    const html = `<p>Une connexion a ete detectee.</p><p>Code de securite <strong>${code}</strong> (valide 5 minutes).</p>`;
    return { text, subject, html };
  }

  if (purpose === "RESET_PASSWORD") {
    const text = `Code de reinitialisation KongoLove: ${code}. Expire dans 5 minutes.`;
    const subject = "Reinitialisation mot de passe";
    const html = `<p>Code de reinitialisation <strong>${code}</strong>.</p><p>Valide 5 minutes.</p>`;
    return { text, subject, html };
  }

  const text = `Votre code de verification KongoLove est ${code}. Il expire dans 5 minutes.`;
  const subject = "Code de verification KongoLove";
  const html = `<p>Votre code de verification <strong>KongoLove</strong> est <strong>${code}</strong>.</p><p>Ce code expire dans 5 minutes.</p>`;
  return { text, subject, html };
}

async function sendSmsWithTwilio(to: string, text: string): Promise<void> {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFrom) {
    throw new Error("Configuration Twilio incomplete");
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: to,
    From: env.twilioFrom,
    Body: text
  });
  const auth = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Echec envoi SMS Twilio: ${details}`);
  }
}

async function sendSmsWithVonage(to: string, text: string): Promise<void> {
  if (!env.vonageApiKey || !env.vonageApiSecret || !env.vonageFrom) {
    throw new Error("Configuration Vonage incomplete");
  }

  const response = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.vonageApiKey,
      api_secret: env.vonageApiSecret,
      to,
      from: env.vonageFrom,
      text
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Echec envoi SMS Vonage: ${details}`);
  }
}

async function sendEmailWithResend(to: string, subject: string, text: string, html: string): Promise<void> {
  if (!env.resendApiKey || !env.resendFromEmail) {
    throw new Error("Configuration Resend incomplete");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.resendFromEmail,
      to: [to],
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Echec envoi email Resend: ${details}`);
  }
}

async function sendEmailWithSendGrid(to: string, subject: string, text: string, html: string): Promise<void> {
  if (!env.sendgridApiKey || !env.sendgridFromEmail) {
    throw new Error("Configuration SendGrid incomplete");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.sendgridApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: { email: env.sendgridFromEmail, name: env.otpSenderName },
      personalizations: [
        {
          to: [{ email: to }],
          subject
        }
      ],
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html }
      ]
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Echec envoi email SendGrid: ${details}`);
  }
}

async function sendEmailWithSmtp(to: string, subject: string, text: string, html: string): Promise<void> {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.smtpFromEmail) {
    throw new Error("Configuration SMTP incomplete");
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  await transporter.sendMail({
    from: `${env.otpSenderName} <${env.smtpFromEmail}>`,
    to,
    subject,
    text,
    html
  });
}

async function sendEmailWithGmail(to: string, subject: string, text: string, html: string): Promise<void> {
  if (!env.smtpUser || !env.smtpPass || !env.smtpFromEmail) {
    throw new Error("Configuration Gmail SMTP incomplete");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  await transporter.sendMail({
    from: `${env.otpSenderName} <${env.smtpFromEmail}>`,
    to,
    subject,
    text,
    html
  });
}

async function deliverOtp(identifier: string, code: string, purpose: "VERIFY_ACCOUNT" | "LOGIN_2FA" | "RESET_PASSWORD"): Promise<void> {
  const { text, subject, html } = buildOtpMessage(code, purpose);
  const provider = env.otpProvider.toLowerCase();

  if (provider === "mock") {
    return;
  }

  if (provider !== "real") {
    throw new Error("OTP_PROVIDER invalide. Utilisez OTP_PROVIDER=real avec un provider SMS/email configure.");
  }

  if (!isEmailIdentifier(identifier)) {
    const smsProvider = env.otpSmsProvider.toLowerCase();
    if (smsProvider === "vonage") {
      await sendSmsWithVonage(identifier, text);
      return;
    }

    await sendSmsWithTwilio(identifier, text);
    return;
  }

  const emailProvider = env.otpEmailProvider.toLowerCase();
  if (emailProvider === "gmail") {
    await sendEmailWithGmail(identifier, subject, text, html);
    return;
  }

  if (emailProvider === "sendgrid") {
    await sendEmailWithSendGrid(identifier, subject, text, html);
    return;
  }

  if (emailProvider === "smtp") {
    await sendEmailWithSmtp(identifier, subject, text, html);
    return;
  }

  await sendEmailWithResend(identifier, subject, text, html);
}

export async function sendOtp(
  identifier: string,
  options?: { purpose?: "VERIFY_ACCOUNT" | "LOGIN_2FA" | "RESET_PASSWORD" }
): Promise<{ sent: boolean; expiresInSeconds: number; destination: string; retryAfterSeconds: number }> {
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  const purpose = options?.purpose ?? "VERIFY_ACCOUNT";

  await enforceOtpRateLimit(identifier);
  await storeOtp(identifier, code);
  let delivered = true;
  try {
    await deliverOtp(identifier, code, purpose);
  } catch (error) {
    delivered = false;
    if (env.nodeEnv === "production") {
      throw error;
    }
    console.warn("[OTP] Fallback dev active, provider indisponible:", (error as Error).message);
  }

  return {
    sent: true,
    expiresInSeconds: OTP_TTL_SECONDS,
    destination: maskIdentifier(identifier),
    retryAfterSeconds: OTP_COOLDOWN_SECONDS
  };
}

export async function verifyOtp(identifier: string, code: string): Promise<boolean> {
  const saved = await readOtp(identifier);
  const valid = saved === code;
  if (!valid) {
    await markVerifyFailure(identifier);
    return false;
  }

  await deleteOtp(identifier);
  return true;
}
