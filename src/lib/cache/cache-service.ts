interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private memoryCache: Map<string, CacheItem<any>> = new Map();
  private inFlightRequests: Map<string, Promise<any>> = new Map();

  /**
   * Fetch item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value as T;
  }

  /**
   * Set item in cache with TTL in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate a single cache key
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix (e.g. `tenant:123:`)
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    const keys = Array.from(this.memoryCache.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Cache-aside with Request Deduplication:
   * Prevents cache stampede / thundering herd problem by sharing the in-flight Promise.
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Deduplicate concurrent fetch requests for the same key
    if (this.inFlightRequests.has(key)) {
      return (await this.inFlightRequests.get(key)) as T;
    }

    const fetchPromise = (async () => {
      try {
        const fresh = await fetchFn();
        if (fresh !== undefined && fresh !== null) {
          await this.set(key, fresh, ttlSeconds);
        }
        return fresh;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, fetchPromise);
    return await fetchPromise;
  }

  /**
   * Helper to clear entire cache (useful in tests)
   */
  clear(): void {
    this.memoryCache.clear();
    this.inFlightRequests.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
