import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false
});

let lastRedisErrorLogAt = 0;

redis.on("error", (error) => {
  const now = Date.now();
  if (now - lastRedisErrorLogAt < 30000) {
    return;
  }

  lastRedisErrorLogAt = now;
  logger.warn("Redis indisponible, certaines fonctions seront degradees", {
    message: error.message
  });
});
