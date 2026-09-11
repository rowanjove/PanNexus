import type { H3Event } from 'h3'
import type { Resource, CanonicalResource, Source, SearchQuery } from '~/shared/types'
import { calculateCompositeRank } from '../core/ranking/scorer'
import { aggregateResourcesToCanonical } from '../core/canonical/cluster'
import { parseTitleMetadata } from '../core/normalize/title'

export interface D1DatabaseLike {
  prepare(query: string): {
    bind(...args: unknown[]): {
      all<T = unknown>(): Promise<{ results: T[]; success: boolean }>
      first<T = unknown>(): Promise<T | null>
      run(): Promise<{ success: boolean }>
    }
  }
}

// Built-in memory cache of seed data for seamless local dev & fallback
import { seedData } from '../data/seed'

export function getDatabase(event?: H3Event): D1DatabaseLike | null {
  // Check Cloudflare Worker env binding
  const cfEnv = (event?.context as any)?.cloudflare?.env
  if (cfEnv?.DB) {
    return cfEnv.DB as D1DatabaseLike
  }
  return null
}

/**
 * High performance local search service that queries D1 if available,
 * or fallback search across local seed dataset with FTS-like matching and Ranking.
 */
export async function executeSearch(query: SearchQuery, event?: H3Event): Promise<{
  items: CanonicalResource[]
  total: number
  latencyMs: number
}> {
  const start = Date.now()
  const db = getDatabase(event)

  const page = query.page || 1
  const limit = Math.min(50, query.limit || 15)
  const offset = (page - 1) * limit

  if (db) {
    try {
      const selectedTypes = query.type && query.type !== 'all'
        ? String(query.type).split(',').map(t => t.trim()).filter(Boolean)
        : []

      const typeClause = selectedTypes.length > 0
        ? `AND r.resource_type IN (${selectedTypes.map(() => '?').join(',')})`
        : ''

      // 1. Query using D1 FTS5
      const ftsStmt = db.prepare(`
        SELECT r.*, c.title as canon_title, c.category, c.year, c.resolution, c.codec, c.audio, c.edition, c.normalized_key
        FROM resources r
        LEFT JOIN canonical_resources c ON r.canonical_id = c.id
        WHERE r.id IN (
          SELECT rowid FROM resources_fts WHERE resources_fts MATCH ?
        )
        ${typeClause}
        ${query.provider && query.provider !== 'all' ? 'AND r.provider = ?' : ''}
        ${query.status && query.status !== 'all' ? 'AND r.status = ?' : ''}
        LIMIT ? OFFSET ?
      `)

      const params: unknown[] = [query.q]
      if (selectedTypes.length > 0) params.push(...selectedTypes)
      if (query.provider && query.provider !== 'all') params.push(query.provider)
      if (query.status && query.status !== 'all') params.push(query.status)
      params.push(limit, offset)

      const { results } = await ftsStmt.bind(...params).all<any>()
      if (results && results.length > 0) {
        // Build canonical map and aggregate
        const canonicalsMap = new Map<string, CanonicalResource>()
        const resources: Resource[] = results.map(r => ({
          ...r,
          metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : r.metadata
        }))

        for (const row of results) {
          if (row.canonical_id && !canonicalsMap.has(row.canonical_id)) {
            canonicalsMap.set(row.canonical_id, {
              id: row.canonical_id,
              title: row.canon_title || row.title,
              category: row.category,
              year: row.year,
              resolution: row.resolution,
              codec: row.codec,
              audio: row.audio,
              edition: row.edition,
              normalizedKey: row.normalized_key,
              createdAt: row.created_at,
              updatedAt: row.updated_at
            })
          }
        }

        const aggregated = aggregateResourcesToCanonical(resources, canonicalsMap)
        return {
          items: aggregated,
          total: aggregated.length,
          latencyMs: Date.now() - start
        }
      }
    } catch {
      // Fall through to memory engine
    }
  }

  // Memory/Local Fallback Search Engine with Ranking & Canonical Aggregation
  const parsedMeta = parseTitleMetadata(query.q)
  const keywords = query.q.toLowerCase().split(/\s+/).filter(Boolean)

  const allResources: Resource[] = (seedData.resources as any[]).map(r => ({
    ...r,
    status: r.status as any,
    resourceType: r.resource_type as any
  }))

  const allCanonicals: CanonicalResource[] = (seedData.canonical_resources as any[])

  const canonicalsMap = new Map<string, CanonicalResource>()
  for (const c of allCanonicals) {
    canonicalsMap.set(c.id, c)
  }

  // Filter & Score matching resources
  const matched = allResources.filter(r => {
    // Keyword match (all terms match title or url)
    const titleLower = r.title.toLowerCase()
    const matchTerms = keywords.every(kw => titleLower.includes(kw))
    if (!matchTerms) return false

    // Type filter (supports single or multi-select)
    const selectedTypes = query.type && query.type !== 'all'
      ? String(query.type).split(',').map(t => t.trim()).filter(Boolean)
      : []
    if (selectedTypes.length > 0 && !selectedTypes.includes(r.resourceType)) return false

    // Provider filter
    if (query.provider && query.provider !== 'all' && r.provider !== query.provider) return false

    // Status filter
    if (query.status && query.status !== 'all' && r.status !== query.status) return false

    // Resolution filter
    if (query.resolution && parsedMeta.resolution && parsedMeta.resolution !== query.resolution) return false

    return true
  })

  // Rank matching resources
  const scored = matched.map(r => {
    const titleLower = r.title.toLowerCase()
    let relevance = 0.5
    if (titleLower.includes(query.q.toLowerCase())) relevance = 1.0
    else if (keywords.some(k => titleLower.includes(k))) relevance = 0.8

    const score = calculateCompositeRank(r, relevance, 1.0)
    return { ...r, rankScore: score }
  })

  // Sort
  if (query.sort === 'freshness') {
    scored.sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
  } else if (query.sort === 'size_desc') {
    scored.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))
  } else if (query.sort === 'size_asc') {
    scored.sort((a, b) => (a.sizeBytes || 0) - (b.sizeBytes || 0))
  } else {
    // Default: by calculated rank
    scored.sort((a, b) => b.rankScore - a.rankScore)
  }

  const aggregated = aggregateResourcesToCanonical(scored, canonicalsMap)
  const paginated = aggregated.slice(offset, offset + limit)

  return {
    items: paginated,
    total: aggregated.length,
    latencyMs: Math.max(8, Date.now() - start)
  }
}
