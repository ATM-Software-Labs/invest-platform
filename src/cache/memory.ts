export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  readonly kind: "memory" | "redis";
}

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

export class MemoryCache implements CacheStore {
  readonly kind = "memory" as const;
  private readonly map = new Map<string, MemoryEntry>();
  private readonly max = 2_000;

  async get(key: string): Promise<string | null> {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return hit.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      if (first) this.map.delete(first);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
