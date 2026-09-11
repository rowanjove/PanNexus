import type { H3Event } from 'h3'
import crypto from 'node:crypto'
import type { SearchQuery, SearchResult } from '~/shared/types'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

// L1: In-Memory cache (fastest, lives for Worker instance lifetime)
const memoryCache = new Map<string, CacheEntry<any>>()

/**
 * Computes deterministic SHA-256 cache key for a search query.
 */
export function computeSearchCacheKey(query: SearchQuery): string {
  const parts = [
    query.q.trim().toLowerCase(),
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
 * Gets cached search result checking L1 (Memory) then L2 (Cloudflare KV).
 */
export async function getSearchCache(event: H3Event | undefined, key: string): Promise<SearchResult | null> {
  const now = Date.now()

  // 1. Check L1 Memory
  const mem = memoryCache.get(key)
  if (mem) {
    if (mem.expiresAt > now) {
      return mem.value
    }
    memoryCache.delete(key)
  }

  // 2. Check L2 Cloudflare KV
  const kv = (event?.context as any)?.cloudflare?.env?.METASEEK_KV
  if (kv) {
    try {
      const data = await kv.get(key, 'json')
      if (data) {
        // Hydrate L1
        memoryCache.set(key, { value: data, expiresAt: now + 60 * 1000 })
        return data
      }
    } catch {
      // Ignore KV error
    }
  }

  return null
}

/**
 * Stores search result into L1 Memory and L2 Cloudflare KV.
 */
export async function setSearchCache(
  event: H3Event | undefined,
  key: string,
  data: SearchResult,
  ttlSeconds = 300
): Promise<void> {
  const now = Date.now()
  const expiresAt = now + ttlSeconds * 1000

  // 1. Set L1 Memory
  memoryCache.set(key, { value: data, expiresAt })

  // Prune memory cache if too large
  if (memoryCache.size > 1000) {
    const oldestKey = memoryCache.keys().next().value
    if (oldestKey) memoryCache.delete(oldestKey)
  }

  // 2. Set L2 Cloudflare KV
  const kv = (event?.context as any)?.cloudflare?.env?.METASEEK_KV
  if (kv) {
    try {
      await kv.put(key, JSON.stringify(data), {
        expirationTtl: Math.max(60, ttlSeconds)
      })
    } catch {
      // Ignore KV error
    }
  }
}
