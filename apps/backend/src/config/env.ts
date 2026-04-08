import "dotenv/config";

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000,https://congolove-web.onrender.com";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  corsOrigin,
  corsOrigins: parseCorsOrigins(corsOrigin),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  redisConfigured: Boolean(process.env.REDIS_URL?.trim()),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "access_secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "refresh_secret",
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? "",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "",
  mediaProvider: process.env.MEDIA_PROVIDER ?? "cloudinary",
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "dev_payment_webhook_secret",
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
