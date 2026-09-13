import { describe, it, expect } from 'vitest'
import {
  computeSearchCacheKey,
  getSearchCache,
  setSearchCache,
  invalidateSearchCache,
  getAdaptiveTtl,
  LruMemoryCache
} from '../../server/utils/cache'

describe('Multi-Layer Cache Engine (LRU & Active Invalidation)', () => {
  it('generates consistent hash keys for identical queries with different spacing/casing', () => {
    const key1 = computeSearchCacheKey({ q: '流浪地球2', type: 'all' })
    const key2 = computeSearchCacheKey({ q: ' 流浪地球2 ', type: 'all' })

    expect(key1).toBe(key2)
    expect(key1.startsWith('search:')).toBe(true)
  })

  it('generates distinct keys for different filters or sort orders', () => {
    const key1 = computeSearchCacheKey({ q: '流浪地球2', sort: 'rank' })
    const key2 = computeSearchCacheKey({ q: '流浪地球2', sort: 'freshness' })
    const key3 = computeSearchCacheKey({ q: '流浪地球2', provider: 'quark' })

    expect(key1).not.toBe(key2)
    expect(key1).not.toBe(key3)
  })

  it('sets and retrieves data from L1 memory cache within TTL', async () => {
    const query = { q: 'unit_test_cache_query' }
    const key = computeSearchCacheKey(query)
    const mockData: any = {
      items: [],
      total: 10,
      page: 1,
      limit: 15,
      latencyMs: 12,
      query: { raw: 'unit_test_cache_query', normalizedKeyword: 'unit_test_cache_query' }
    }

    await setSearchCache(undefined, key, mockData, 60)
    const cached = await getSearchCache(undefined, key)

    expect(cached).toBeDefined()
    expect(cached?.total).toBe(10)
  })

  it('evaluates true LRU access-order eviction', () => {
    const lru = new LruMemoryCache<string>(3)
    lru.set('a', 'alpha', 60000)
    lru.set('b', 'beta', 60000)
    lru.set('c', 'gamma', 60000)

    // Access 'a' to make it most recently used
    expect(lru.get('a')).toBe('alpha')

    // Add 'd', which should evict 'b' (least recently used)
    lru.set('d', 'delta', 60000)

    expect(lru.get('b')).toBeNull() // evicted!
    expect(lru.get('a')).toBe('alpha') // still alive!
    expect(lru.get('c')).toBe('gamma')
    expect(lru.get('d')).toBe('delta')
  })

  it('actively invalidates cached queries by keyword upon ingest or live search', async () => {
    const q = 'dune_part_two_test'
    const key = computeSearchCacheKey({ q })
    const mockData: any = {
      items: [],
      total: 5,
      query: { raw: q, normalizedKeyword: q }
    }

    await setSearchCache(undefined, key, mockData, 60)
    expect(await getSearchCache(undefined, key)).not.toBeNull()

    // Invalidate keyword
    const evicted = await invalidateSearchCache(q)
    expect(evicted).toBeGreaterThan(0)
    expect(await getSearchCache(undefined, key)).toBeNull()
  })

  it('assigns adaptive short TTL for empty queries to prevent cache penetration lock', () => {
    expect(getAdaptiveTtl(0)).toBe(30)
    expect(getAdaptiveTtl(12)).toBe(300)
  })
})
