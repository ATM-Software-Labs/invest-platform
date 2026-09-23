import type { AppConfig } from "../config.js";
import { MemoryCache, type CacheStore } from "./memory.js";

export type { CacheStore };
export { MemoryCache };

export async function createCache(config: AppConfig): Promise<CacheStore> {
  if (!config.REDIS_URL) return new MemoryCache();
  try {
    const { Redis } = await import("ioredis");
    const redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 1500,
    });
    await redis.connect();
    await redis.ping();
    redis.on("error", () => undefined);
    return {
      kind: "redis" as const,
      get: (key: string) => redis.get(key),
      set: async (key: string, value: string, ttlSeconds: number) => {
        await redis.set(key, value, "EX", ttlSeconds);
      },
    };
  } catch {
    return new MemoryCache();
  }
}

export function ttlForAssetClass(config: AppConfig, assetClass: string): number {
  if (assetClass === "crypto") return config.CACHE_TTL_CRYPTO_SECONDS;
  if (assetClass === "bond" || assetClass === "forex") return config.CACHE_TTL_MACRO_SECONDS;
  return config.CACHE_TTL_FUNDAMENTALS_SECONDS;
}
