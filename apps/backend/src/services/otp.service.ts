import { env } from "../config/env";
import { redis } from "../config/redis";
import nodemailer from "nodemailer";

const OTP_PREFIX = "otp:";
const OTP_TTL_SECONDS = 300;
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
    return;
  } catch {
    memoryOtpStore.set(normalizeOtpKey(identifier), {
      code,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000
    });
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

function buildOtpMessage(code: string): { text: string; subject: string; html: string } {
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

async function deliverOtp(identifier: string, code: string): Promise<void> {
  const { text, subject, html } = buildOtpMessage(code);
  const provider = env.otpProvider.toLowerCase();

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

export async function sendOtp(identifier: string): Promise<{ sent: boolean; expiresInSeconds: number; destination: string }> {
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  await storeOtp(identifier, code);
  await deliverOtp(identifier, code);

  return {
    sent: true,
    expiresInSeconds: OTP_TTL_SECONDS,
    destination: maskIdentifier(identifier)
  };
}

export async function verifyOtp(identifier: string, code: string): Promise<boolean> {
  const saved = await readOtp(identifier);
  return saved === code;
}
