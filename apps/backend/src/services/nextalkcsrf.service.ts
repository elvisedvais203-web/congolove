import crypto from "crypto";
import { redis } from "../config/nextalkredis";

const CSRF_PREFIX = "csrf:";
const CSRF_TTL_SECONDS = 60 * 30;

function csrfKey(userId: string): string {
  return `${CSRF_PREFIX}${userId}`;
}

export async function issueCsrfToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(24).toString("hex");
  await redis.setex(csrfKey(userId), CSRF_TTL_SECONDS, token);
  return token;
}

export async function validateCsrfToken(userId: string, token: string): Promise<boolean> {
  const saved = await redis.get(csrfKey(userId));
  return Boolean(saved && token && saved === token);
}
