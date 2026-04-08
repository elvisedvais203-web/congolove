import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

type RedisMultiLike = {
  incr: (key: string) => RedisMultiLike;
  expire: (key: string, seconds: number) => RedisMultiLike;
  exec: () => Promise<Array<[Error | null, unknown]>>;
};

export type RedisLike = {
  get: (key: string) => Promise<string | null>;
  setex: (key: string, seconds: number, value: string) => Promise<"OK">;
  set: (key: string, value: string, mode?: "EX", seconds?: number, flag?: "NX") => Promise<"OK" | null>;
  sadd: (key: string, ...members: string[]) => Promise<number>;
  srem: (key: string, ...members: string[]) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  scard: (key: string) => Promise<number>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  ping: () => Promise<"PONG">;
  multi: () => RedisMultiLike;
  disconnect: () => void;
  on: (event: "error", listener: (error: Error) => void) => void;
};

type MemoryEntry = {
  value: string | Set<string>;
  expiresAt?: number;
};

class MemoryRedis implements RedisLike {
  private readonly store = new Map<string, MemoryEntry>();

  private getEntry(key: string): MemoryEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  private ensureSet(key: string): Set<string> {
    const existing = this.getEntry(key);
    if (existing?.value instanceof Set) {
      return existing.value;
    }

    const next = new Set<string>();
    this.store.set(key, { value: next, expiresAt: existing?.expiresAt });
    return next;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.getEntry(key);
    return typeof entry?.value === "string" ? entry.value : null;
  }

  async setex(key: string, seconds: number, value: string): Promise<"OK"> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return "OK";
  }

  async set(key: string, value: string, mode?: "EX", seconds?: number, flag?: "NX"): Promise<"OK" | null> {
    const existing = this.getEntry(key);
    if (flag === "NX" && existing) {
      return null;
    }

    const expiresAt = mode === "EX" && seconds ? Date.now() + seconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const set = this.ensureSet(key);
    const before = set.size;
    for (const member of members) {
      set.add(member);
    }
    return set.size - before;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.ensureSet(key);
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed += 1;
      }
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    return Array.from(this.ensureSet(key));
  }

  async scard(key: string): Promise<number> {
    return this.ensureSet(key).size;
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) ?? "0") + 1;
    this.store.set(key, { value: String(current), expiresAt: this.getEntry(key)?.expiresAt });
    return current;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.getEntry(key);
    if (!entry) {
      return 0;
    }

    entry.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, entry);
    return 1;
  }

  async ping(): Promise<"PONG"> {
    return "PONG";
  }

  multi(): RedisMultiLike {
    const operations: Array<() => Promise<unknown>> = [];
    return {
      incr: (key: string) => {
        operations.push(() => this.incr(key));
        return this.multiFromOperations(operations);
      },
      expire: (key: string, seconds: number) => {
        operations.push(() => this.expire(key, seconds));
        return this.multiFromOperations(operations);
      },
      exec: async () => {
        const results: Array<[Error | null, unknown]> = [];
        for (const operation of operations) {
          try {
            results.push([null, await operation()]);
          } catch (error) {
            results.push([error instanceof Error ? error : new Error(String(error)), null]);
          }
        }
        return results;
      }
    };
  }

  private multiFromOperations(operations: Array<() => Promise<unknown>>): RedisMultiLike {
    return {
      incr: (key: string) => {
        operations.push(() => this.incr(key));
        return this.multiFromOperations(operations);
      },
      expire: (key: string, seconds: number) => {
        operations.push(() => this.expire(key, seconds));
        return this.multiFromOperations(operations);
      },
      exec: async () => {
        const results: Array<[Error | null, unknown]> = [];
        for (const operation of operations) {
          try {
            results.push([null, await operation()]);
          } catch (error) {
            results.push([error instanceof Error ? error : new Error(String(error)), null]);
          }
        }
        return results;
      }
    };
  }

  disconnect(): void {
    // no-op
  }

  on(_event: "error", _listener: (error: Error) => void): void {
    // no-op
  }
}

let lastRedisErrorLogAt = 0;

function createRedisClient(): RedisLike {
  if (!env.redisConfigured) {
    logger.warn("REDIS_URL absent, fallback memoire active");
    return new MemoryRedis();
  }

  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 5000
  });

  client.on("error", (error) => {
    const now = Date.now();
    if (now - lastRedisErrorLogAt < 30000) {
      return;
    }

    lastRedisErrorLogAt = now;
    logger.warn("Redis indisponible, certaines fonctions seront degradees", {
      message: error.message
    });
  });

  return client as unknown as RedisLike;
}

export const redis = createRedisClient();
