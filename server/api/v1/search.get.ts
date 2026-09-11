import { defineEventHandler, getQuery } from 'h3'
import type { SearchQuery, SearchResult, Provider, ResourceType, ResourceStatus } from '~/shared/types'
import { executeSearch } from '../../utils/db'
import { parseTitleMetadata } from '../../core/normalize/title'

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

  const parsedMeta = parseTitleMetadata(q)

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

  const result = await executeSearch(searchQuery, event)

  return {
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
})
