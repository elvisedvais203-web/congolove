import "dotenv/config";

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const corsOrigin =
  process.env.CORS_ORIGIN ??
  "http://localhost:3000,https://congolove-web.onrender.com,https://nextalk-web.onrender.com";
const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

function requiredInProduction(name: string, value: string): string {
  const normalized = String(value ?? "").trim();
  if (isProduction && !normalized) {
    throw new Error(`Variable d'environnement requise en production: ${name}`);
  }
  return normalized;
}

function rejectWeakSecretInProduction(name: string, value: string, forbidden: string[]): string {
  const normalized = String(value ?? "").trim();
  if (isProduction && forbidden.includes(normalized)) {
    throw new Error(`Secret non securise en production pour ${name}`);
  }
  return normalized;
}

const databaseUrl = requiredInProduction("DATABASE_URL", process.env.DATABASE_URL ?? "");
const jwtAccessSecret = rejectWeakSecretInProduction("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET ?? "access_secret", ["", "access_secret"]);
const jwtRefreshSecret = rejectWeakSecretInProduction("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET ?? "refresh_secret", ["", "refresh_secret"]);
const paymentWebhookSecret = rejectWeakSecretInProduction("PAYMENT_WEBHOOK_SECRET", process.env.PAYMENT_WEBHOOK_SECRET ?? "dev_payment_webhook_secret", ["", "dev_payment_webhook_secret"]);

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID ?? "";
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? "";
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "";
if (isProduction && !firebaseServiceAccountJson && (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey)) {
  throw new Error("Configuration Firebase Admin incomplete en production");
}

const mediaProvider = process.env.MEDIA_PROVIDER ?? "cloudinary";
if (isProduction && mediaProvider === "cloudinary") {
  requiredInProduction("CLOUDINARY_CLOUD_NAME", process.env.CLOUDINARY_CLOUD_NAME ?? "");
  requiredInProduction("CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY ?? "");
  requiredInProduction("CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET ?? "");
}

const corsOrigins = parseCorsOrigins(corsOrigin);
if (isProduction && corsOrigins.length === 0) {
  throw new Error("CORS_ORIGIN doit contenir au moins une origine en production");
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  corsOrigin,
  corsOrigins,
  databaseUrl,
  redisUrl: process.env.REDIS_URL ?? "",
  redisConfigured: Boolean(process.env.REDIS_URL?.trim()),
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
  firebaseProjectId,
  firebaseClientEmail,
  firebasePrivateKey,
  firebaseServiceAccountJson,
  mediaProvider,
  paymentWebhookSecret,
  mmAirtelApiUrl: process.env.MM_AIRTEL_API_URL ?? "",
  mmAirtelApiToken: process.env.MM_AIRTEL_API_TOKEN ?? "",
  mmOrangeApiUrl: process.env.MM_ORANGE_API_URL ?? "",
  mmOrangeApiToken: process.env.MM_ORANGE_API_TOKEN ?? "",
  mmMPesaApiUrl: process.env.MM_MPESA_API_URL ?? "",
  mmMPesaApiToken: process.env.MM_MPESA_API_TOKEN ?? "",
  mmAfricellApiUrl: process.env.MM_AFRICELL_API_URL ?? "",
  mmAfricellApiToken: process.env.MM_AFRICELL_API_TOKEN ?? "",
  mmAfrimoneyApiUrl: process.env.MM_AFRIMONEY_API_URL ?? "",
  mmAfrimoneyApiToken: process.env.MM_AFRIMONEY_API_TOKEN ?? "",
  webPushVapidPublicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? "",
  webPushVapidPrivateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? "",
  superAdminEmail: process.env.SUPERADMIN_EMAIL ?? "",
  superAdminPhone: process.env.SUPERADMIN_PHONE ?? "",
  superAdminPassword: process.env.SUPERADMIN_PASSWORD ?? ""
};
