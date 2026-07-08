// ============================================================================
// TRUF GAMING — Cache Provider Abstraction
// Development: In-memory LRU cache
// Production:  Redis (Upstash or ioredis) — swap the adapter without
//              changing any calling code.
// ============================================================================

interface CacheProvider {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  flush(): Promise<void>
}

// ---- In-Memory LRU Cache (Development / Fallback) ----

class MemoryCache implements CacheProvider {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>()
  private readonly maxSize: number

  constructor(maxSize = 500) {
    this.maxSize = maxSize
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.store.size >= this.maxSize) {
      // Evict oldest entry (first key in Map iteration order)
      const firstKey = this.store.keys().next().value
      if (firstKey !== undefined) this.store.delete(firstKey)
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async flush(): Promise<void> {
    this.store.clear()
  }
}

// ---- Singleton Instance ----

let _cacheInstance: CacheProvider | null = null

/**
 * Returns the cache provider.
 * In development, uses an in-memory LRU map.
 * In production, swap this factory to return a Redis adapter.
 */
export function getCache(): CacheProvider {
  if (!_cacheInstance) {
    // Future: if (isProduction()) { _cacheInstance = new RedisCache() }
    _cacheInstance = new MemoryCache()
  }
  return _cacheInstance
}

export type { CacheProvider }
