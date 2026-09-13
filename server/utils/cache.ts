import type { H3Event } from 'h3'
import crypto from 'node:crypto'
import type { SearchQuery, SearchResult } from '~/shared/types'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * High-performance, zero-dependency Least-Recently-Used (LRU) Memory Cache.
 * Evicts true least-recently accessed items when capacity is reached,
 * and supports fast prefix / keyword invalidation.
 */
export class LruMemoryCache<T> {
  private capacity: number
  private map: Map<string, CacheEntry<T>>

  constructor(capacity = 2000) {
    this.capacity = capacity
    this.map = new Map()
  }

  get(key: string): T | null {
    const entry = this.map.get(key)
    if (!entry) return null

    const now = Date.now()
    if (entry.expiresAt <= now) {
      this.map.delete(key)
      return null
    }

    // Refresh access order (re-insert to tail of Map)
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.capacity) {
      // Evict least-recently used item (first key in insertion order)
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey)
      }
    }

    this.map.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    })
  }

  delete(key: string): boolean {
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }

  invalidateByPredicate(predicate: (key: string) => boolean): number {
    let count = 0
    for (const key of Array.from(this.map.keys())) {
      if (predicate(key)) {
        this.map.delete(key)
        count++
      }
    }
    return count
  }
}

// Global L1 Memory Cache instance
export const globalSearchLruCache = new LruMemoryCache<SearchResult>(2000)

// Inverted index for O(1) keyword invalidation: normalizedKeyword -> Set<cacheKey>
const keywordToCacheKeys = new Map<string, Set<string>>()

function registerKeywordKey(keyword: string, cacheKey: string) {
  const norm = keyword.trim().toLowerCase()
  if (!norm) return
  if (!keywordToCacheKeys.has(norm)) {
    keywordToCacheKeys.set(norm, new Set())
  }
  const set = keywordToCacheKeys.get(norm)!
  set.add(cacheKey)
  if (set.size > 200) {
    // Prune excessive query variants per keyword
    const first = set.values().next().value
    if (first) set.delete(first)
  }
}

/**
 * Computes deterministic SHA-256 cache key for a search query.
 */
export function computeSearchCacheKey(query: SearchQuery): string {
  const normQ = (query.q || '').trim().toLowerCase()
  const parts = [
    normQ,
    query.type || 'all',
    query.provider || 'all',
    query.resolution || 'all',
    query.sort || 'rank',
    query.page || 1,
    query.limit || 15
  ].join('|')

  return `search:${crypto.createHash('sha256').update(parts).digest('hex')}`
}

/**
 * Calculates adaptive TTL:
 * - Empty search results (0 items): 30 seconds (prevent stale empty locks & allow quick cache warming)
 * - Rich results (> 0 items): 300 seconds (5 minutes standard)
 */
export function getAdaptiveTtl(total: number): number {
  return total === 0 ? 30 : 300
}

/**
 * Gets cached search result checking L1 LRU Memory then L2 Cloudflare KV.
 */
export async function getSearchCache(event: H3Event | undefined, key: string): Promise<SearchResult | null> {
  // 1. Check L1 LRU Memory
  const mem = globalSearchLruCache.get(key)
  if (mem) {
    return mem
  }

  // 2. Check L2 Cloudflare KV
  const kv = (event?.context as any)?.cloudflare?.env?.METASEEK_KV
  if (kv) {
    try {
      const data = await kv.get(key, 'json') as SearchResult | null
      if (data) {
        // Hydrate L1 with 60s window
        globalSearchLruCache.set(key, data, 60 * 1000)
        return data
      }
    } catch {
      // Ignore KV error
    }
  }

  return null
}

/**
 * Stores search result into L1 LRU Memory and L2 Cloudflare KV with adaptive TTL.
 */
export async function setSearchCache(
  event: H3Event | undefined,
  key: string,
  data: SearchResult,
  ttlSeconds?: number
): Promise<void> {
  const actualTtl = ttlSeconds ?? getAdaptiveTtl(data.total)

  // 1. Set L1 LRU Memory
  globalSearchLruCache.set(key, data, actualTtl * 1000)

  // Index keyword for rapid active invalidation
  if (data.query?.raw) {
    registerKeywordKey(data.query.raw, key)
  }
  if (data.query?.normalizedKeyword) {
    registerKeywordKey(data.query.normalizedKeyword, key)
  }

  // 2. Set L2 Cloudflare KV
  const kv = (event?.context as any)?.cloudflare?.env?.METASEEK_KV
  if (kv) {
    try {
      await kv.put(key, JSON.stringify(data), {
        expirationTtl: Math.max(30, actualTtl)
      })
    } catch {
      // Ignore KV error
    }
  }
}

/**
 * Actively invalidates search cache entries.
 * - When keyword is provided: invalidates all query combinations associated with this keyword.
 * - When keyword is omitted: purges entire search memory cache.
 */
export async function invalidateSearchCache(keyword?: string, event?: H3Event): Promise<number> {
  if (!keyword) {
    const size = globalSearchLruCache.size
    globalSearchLruCache.clear()
    keywordToCacheKeys.clear()
    return size
  }

  const norm = keyword.trim().toLowerCase()
  let invalidatedCount = 0

  const keys = keywordToCacheKeys.get(norm)
  if (keys) {
    for (const k of keys) {
      if (globalSearchLruCache.delete(k)) {
        invalidatedCount++
      }
      // Evict from KV if available
      const kv = (event?.context as any)?.cloudflare?.env?.METASEEK_KV
      if (kv) {
        try {
          await kv.delete(k)
        } catch {}
      }
    }
    keywordToCacheKeys.delete(norm)
  }

  // Fuzzy match in memory if keyword contains partial tokens
  invalidatedCount += globalSearchLruCache.invalidateByPredicate(key => {
    return key.includes(norm)
  })

  return invalidatedCount
}
