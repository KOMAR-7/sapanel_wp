const test = require('node:test');
const assert = require('node:assert');

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.inFlightRequests = new Map();
  }

  async get(key) {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 300) {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async deleteByPrefix(prefix) {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async getOrSet(key, fetchFn, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    if (this.inFlightRequests.has(key)) {
      return await this.inFlightRequests.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const fresh = await fetchFn();
        await this.set(key, fresh, ttlSeconds);
        return fresh;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, fetchPromise);
    return await fetchPromise;
  }
}

test('CacheService - get, set, and TTL expiration', async () => {
  const cache = new CacheService();
  await cache.set('test:key', { name: 'Spice Route' }, 1); // 1 sec TTL

  const val1 = await cache.get('test:key');
  assert.deepStrictEqual(val1, { name: 'Spice Route' });

  // Wait 1.1s for expiration
  await new Promise((r) => setTimeout(r, 1100));
  const val2 = await cache.get('test:key');
  assert.strictEqual(val2, null);
});

test('CacheService - deleteByPrefix invalidates related keys', async () => {
  const cache = new CacheService();
  await cache.set('tenant:123:meta', { name: 'T1' });
  await cache.set('tenant:123:features', ['F1', 'F2']);
  await cache.set('tenant:456:meta', { name: 'T2' });

  await cache.deleteByPrefix('tenant:123:');

  assert.strictEqual(await cache.get('tenant:123:meta'), null);
  assert.strictEqual(await cache.get('tenant:123:features'), null);
  assert.deepStrictEqual(await cache.get('tenant:456:meta'), { name: 'T2' });
});

test('CacheService - Request Deduplication prevents cache stampede', async () => {
  const cache = new CacheService();
  let dbCallCount = 0;

  const expensiveFetch = async () => {
    dbCallCount++;
    await new Promise((r) => setTimeout(r, 50));
    return { data: 'live_data' };
  };

  // Launch 10 simultaneous requests for the exact same key
  const results = await Promise.all([
    cache.getOrSet('resource:heavy', expensiveFetch),
    cache.getOrSet('resource:heavy', expensiveFetch),
    cache.getOrSet('resource:heavy', expensiveFetch),
    cache.getOrSet('resource:heavy', expensiveFetch),
    cache.getOrSet('resource:heavy', expensiveFetch),
  ]);

  // All 5 callers received the exact result, but the DB was only called ONCE
  assert.strictEqual(dbCallCount, 1);
  for (const r of results) {
    assert.deepStrictEqual(r, { data: 'live_data' });
  }
});
