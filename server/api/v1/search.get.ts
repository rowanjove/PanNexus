import { defineEventHandler, getQuery } from 'h3'
import type { SearchQuery, SearchResult, Provider, ResourceType, ResourceStatus } from '~/shared/types'
import { executeSearch } from '../../utils/db'
import { parseTitleMetadata } from '../../core/normalize/title'
import { computeSearchCacheKey, getSearchCache, setSearchCache } from '../../utils/cache'
import { recordSearchAnalytics } from '../../utils/analytics'

export default defineEventHandler(async (event): Promise<SearchResult> => {
  const query = getQuery(event)
  const q = String(query.q || '').trim()

  if (!q) {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 15,
      latencyMs: 0,
      query: {
        raw: '',
        normalizedKeyword: ''
      }
    }
  }

  const searchQuery: SearchQuery = {
    q,
    type: (query.type as ResourceType) || 'all',
    provider: (query.provider as Provider) || 'all',
    resolution: query.resolution ? String(query.resolution) : undefined,
    status: (query.status as ResourceStatus) || 'all',
    sort: (query.sort as any) || 'rank',
    page: query.page ? parseInt(String(query.page), 10) : 1,
    limit: query.limit ? parseInt(String(query.limit), 10) : 15
  }

  // 1. Check L1 Memory / L2 KV Cache
  const cacheKey = computeSearchCacheKey(searchQuery)
  const cached = await getSearchCache(event, cacheKey)
  if (cached) {
    // Record analytics asynchronously even on cache hit
    recordSearchAnalytics(event, q, cached.total)
    return {
      ...cached,
      latencyMs: 1 // Instant cache hit
    }
  }

  const parsedMeta = parseTitleMetadata(q)
  const result = await executeSearch(searchQuery, event)

  const response: SearchResult = {
    items: result.items,
    total: result.total,
    page: searchQuery.page || 1,
    limit: searchQuery.limit || 15,
    latencyMs: result.latencyMs,
    query: {
      raw: q,
      normalizedKeyword: parsedMeta.normalizedTitle,
      resolution: parsedMeta.resolution,
      year: parsedMeta.year,
      edition: parsedMeta.edition
    }
  }

  // 2. Set L1 & L2 Cache (TTL 5 minutes)
  await setSearchCache(event, cacheKey, response, 300)

  // 3. Record search analytics & zero result query asynchronously
  recordSearchAnalytics(event, q, result.total)

  return response
})
