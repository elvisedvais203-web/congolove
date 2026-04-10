import "dotenv/config";

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000,https://congolove-web.onrender.com";
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

function rejectPlaceholderInProduction(name: string, value: string, forbiddenSnippets: string[]): string {
  const normalized = String(value ?? "").trim();
  if (!isProduction) {
    return normalized;
  }

  const lowered = normalized.toLowerCase();
  const hasPlaceholder = forbiddenSnippets.some((snippet) => lowered.includes(snippet.toLowerCase()));
  if (hasPlaceholder) {
    throw new Error(`Variable d'environnement invalide en production (${name}): placeholder detecte`);
  }

  return normalized;
}

const databaseUrl = rejectPlaceholderInProduction(
  "DATABASE_URL",
  requiredInProduction("DATABASE_URL", process.env.DATABASE_URL ?? ""),
  ["user:password@host", "db_name", "changeme", "replace_me"]
);
const jwtAccessSecret = rejectWeakSecretInProduction("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET ?? "access_secret", ["", "access_secret"]);
const jwtRefreshSecret = rejectWeakSecretInProduction("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET ?? "refresh_secret", ["", "refresh_secret"]);
const paymentWebhookSecret = rejectWeakSecretInProduction("PAYMENT_WEBHOOK_SECRET", process.env.PAYMENT_WEBHOOK_SECRET ?? "dev_payment_webhook_secret", ["", "dev_payment_webhook_secret"]);

const redisUrl = rejectPlaceholderInProduction(
  "REDIS_URL",
  process.env.REDIS_URL ?? "",
  ["password@host", ":port", "changeme", "replace_me"]
);
if (isProduction && !redisUrl.trim()) {
  throw new Error("Variable d'environnement requise en production: REDIS_URL");
}

const firebaseProjectId = rejectPlaceholderInProduction("FIREBASE_PROJECT_ID", process.env.FIREBASE_PROJECT_ID ?? "", ["your-firebase-project-id", "xxxxx"]);
const firebaseClientEmail = rejectPlaceholderInProduction("FIREBASE_CLIENT_EMAIL", process.env.FIREBASE_CLIENT_EMAIL ?? "", ["firebase-adminsdk-xxxxx", "your-firebase-project-id"]);
const firebasePrivateKey = rejectPlaceholderInProduction("FIREBASE_PRIVATE_KEY", process.env.FIREBASE_PRIVATE_KEY ?? "", ["-----begin private key-----\n...", "replace_me", "changeme"]);
const firebaseServiceAccountJson = rejectPlaceholderInProduction("FIREBASE_SERVICE_ACCOUNT_JSON", process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "", ["your-firebase-project-id", "-----begin private key-----\\n..."]);
if (isProduction && !firebaseServiceAccountJson && (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey)) {
  throw new Error("Configuration Firebase Admin incomplete en production");
}

const mediaProvider = process.env.MEDIA_PROVIDER ?? "cloudinary";
if (isProduction && mediaProvider === "cloudinary") {
  rejectPlaceholderInProduction(
    "CLOUDINARY_CLOUD_NAME",
    requiredInProduction("CLOUDINARY_CLOUD_NAME", process.env.CLOUDINARY_CLOUD_NAME ?? ""),
    ["ton_cloud_name", "your_cloud_name"]
  );
  rejectPlaceholderInProduction(
    "CLOUDINARY_API_KEY",
    requiredInProduction("CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY ?? ""),
    ["ton_api_key", "your_api_key", "replace_me"]
  );
  rejectPlaceholderInProduction(
    "CLOUDINARY_API_SECRET",
    requiredInProduction("CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET ?? ""),
    ["ton_api_secret", "your_api_secret", "replace_me"]
  );
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
  redisUrl,
  redisConfigured: Boolean(redisUrl.trim()),
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
