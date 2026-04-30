import crypto from "crypto";
import { redis } from "../config/nextalkredis";

type SpamCheckResult = {
  blocked: boolean;
  reason?: string;
};

function normalizedText(input?: string): string {
  return (input ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function hashText(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}

export async function checkMessageSpam(userId: string, text?: string): Promise<SpamCheckResult> {
  const now = Date.now();
  const normalized = normalizedText(text);

  const floodKey = `spam:flood:${userId}:${Math.floor(now / 20000)}`;
  const floodCount = await redis.incr(floodKey);
  if (floodCount === 1) {
    await redis.expire(floodKey, 25);
  }
  if (floodCount > 8) {
    return { blocked: true, reason: "Trop de messages en peu de temps" };
  }

  if (normalized.length > 0) {
    const hash = hashText(normalized);
    const dupeKey = `spam:dupe:${userId}:${hash}`;
    const dupeCount = await redis.incr(dupeKey);
    if (dupeCount === 1) {
      await redis.expire(dupeKey, 60);
    }
    if (dupeCount > 3) {
      return { blocked: true, reason: "Message repete detecte" };
    }

    const links = normalized.match(/https?:\/\/|www\.|\.com|\.net|\.org/g)?.length ?? 0;
    if (links >= 3) {
      return { blocked: true, reason: "Message potentiellement spam (liens excessifs)" };
    }
  }

  return { blocked: false };
}
