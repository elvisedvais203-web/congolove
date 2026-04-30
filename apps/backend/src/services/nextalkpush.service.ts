import { redis } from "../config/nextalkredis";

const keyForUser = (userId: string) => `push:tokens:${userId}`;

export async function registerPushToken(userId: string, token: string): Promise<void> {
  await redis.sadd(keyForUser(userId), token);
}

export async function removePushToken(userId: string, token: string): Promise<void> {
  await redis.srem(keyForUser(userId), token);
}

export async function listPushTokens(userId: string): Promise<string[]> {
  return redis.smembers(keyForUser(userId));
}

export async function estimatePushDelivery(userIds: string[]): Promise<{ recipients: number; tokens: number }> {
  let total = 0;
  for (const userId of userIds) {
    total += await redis.scard(keyForUser(userId));
  }
  return { recipients: userIds.length, tokens: total };
}
