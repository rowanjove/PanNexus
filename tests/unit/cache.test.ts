import { describe, it, expect } from 'vitest'
import { computeSearchCacheKey, getSearchCache, setSearchCache } from '../../server/utils/cache'

describe('Multi-Layer Cache Engine', () => {
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
})
