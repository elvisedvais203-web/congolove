import { MessageType } from "@prisma/client";
import { prisma } from "../config/db";
import { redis } from "../config/redis";
import { checkFreemiumLimit } from "./freemium.service";
import { checkMessageSpam } from "./spam-detection.service";

function usageKey(userId: string, action: "likes" | "messages"): string {
  const date = new Date().toISOString().slice(0, 10);
  return `usage:${action}:${userId}:${date}`;
}

export async function canSendMessage(userId: string, tier: "FREE" | "PREMIUM") {
  const key = usageKey(userId, "messages");
  let usage = 0;
  try {
    usage = Number((await redis.get(key)) ?? "0");
  } catch {
    usage = 0;
  }
  const check = checkFreemiumLimit(tier, "messages", usage);
  return { ...check, usage, key };
}

export async function saveMessage(input: {
  matchId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  planTier: "FREE" | "PREMIUM";
}) {
  const usageCheck = await canSendMessage(input.senderId, input.planTier);
  if (!usageCheck.allowed) {
    throw new Error(`Limite de messages atteinte (${usageCheck.limit}/jour)`);
  }

  const spamCheck = await checkMessageSpam(input.senderId, input.text);
  if (spamCheck.blocked) {
    throw new Error(spamCheck.reason ?? "Message bloque pour suspicion de spam");
  }

  const message = await prisma.message.create({
    data: {
      matchId: input.matchId,
      senderId: input.senderId,
      type: input.type,
      text: input.text,
      mediaUrl: input.mediaUrl
    }
  });

  try {
    await redis.multi().incr(usageCheck.key).expire(usageCheck.key, 86400).exec();
  } catch {
    // Degrade silently when Redis is unavailable; persistence remains primary.
  }

  return message;
}
