import type { H3Event } from 'h3'
import type { Resource, CanonicalResource, SearchQuery } from '~/shared/types'
import { calculateCompositeRank } from '../core/ranking/scorer'
import { aggregateResourcesToCanonical } from '../core/canonical/cluster'
import { parseTitleMetadata } from '../core/normalize/title'
import { isResourceBlocked, type BlockedItem } from '../core/ingest/blocked'

export interface D1Statement {
  bind(...args: unknown[]): D1Statement
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<{ success: boolean; meta?: { last_row_id?: number } }>
}

export interface D1DatabaseLike {
  prepare(query: string): D1Statement
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
  const q = String(query.q || '').trim()
  if (!q) {
    return {
      items: [],
      total: 0,
      latencyMs: 0
    }
  }

  const db = getDatabase(event)

  const page = query.page || 1
  const limit = Math.min(50, query.limit || 15)
  const offset = (page - 1) * limit

  let blocked: BlockedItem[] = []
  if (db) {
    try {
      const { results: blockedRows } = await db.prepare('SELECT type, value FROM blocked_items').all<BlockedItem>()
      blocked = blockedRows || []
    } catch {
      blocked = []
    }
  }

  if (db) {
    try {
      const selectedTypes = query.type && query.type !== 'all'
        ? String(query.type).split(',').map(t => t.trim()).filter(Boolean)
        : []

      const selectedCategories = query.category && query.category !== 'all'
        ? String(query.category).split(',').map(c => c.trim()).filter(Boolean)
        : []

      const typeClause = selectedTypes.length > 0
        ? `AND r.resource_type IN (${selectedTypes.map(() => '?').join(',')})`
        : ''

      const categoryClause = selectedCategories.length > 0
        ? `AND c.category IN (${selectedCategories.map(() => '?').join(',')})`
        : ''

      const ftsQuery = query.q.replace(/["'*()]/g, ' ').trim()
      const isFtsValid = ftsQuery.length >= 3
      let whereFts = '1=1'
      if (ftsQuery) {
        if (isFtsValid) {
          whereFts = `r.id IN (SELECT rowid FROM resources_fts WHERE resources_fts MATCH ?)`
        } else {
          whereFts = `(r.title LIKE ? OR r.normalized_title LIKE ?)`
        }
      }

      const resolutionClause = query.resolution && query.resolution !== 'all'
        ? `AND (c.resolution = ? OR r.metadata LIKE ?)`
        : ''

      const minSizeClause = query.minSize !== undefined && query.minSize > 0
        ? `AND r.size_bytes >= ?`
        : ''

      const maxSizeClause = query.maxSize !== undefined && query.maxSize > 0
        ? `AND r.size_bytes <= ?`
        : ''

      const filterSql = `
        ${typeClause}
        ${categoryClause}
        ${query.provider && query.provider !== 'all' ? 'AND r.provider = ?' : ''}
        ${query.status && query.status !== 'all' ? 'AND r.status = ?' : ''}
        ${resolutionClause}
        ${minSizeClause}
        ${maxSizeClause}
      `

      const bindFilters = (params: unknown[]) => {
        if (ftsQuery) {
          if (isFtsValid) {
            params.push(ftsQuery)
          } else {
            params.push(`%${ftsQuery}%`, `%${ftsQuery}%`)
          }
        }
        if (selectedTypes.length > 0) params.push(...selectedTypes)
        if (selectedCategories.length > 0) params.push(...selectedCategories)
        if (query.provider && query.provider !== 'all') params.push(query.provider)
        if (query.status && query.status !== 'all') params.push(query.status)
        if (query.resolution && query.resolution !== 'all') params.push(query.resolution, `%"resolution":"${query.resolution}"%`)
        if (query.minSize !== undefined && query.minSize > 0) params.push(query.minSize)
        if (query.maxSize !== undefined && query.maxSize > 0) params.push(query.maxSize)
      }

      const countStmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM resources r
        LEFT JOIN canonical_resources c ON r.canonical_id = c.id
        WHERE ${whereFts} ${filterSql}
      `)
      const countParams: unknown[] = []
      bindFilters(countParams)
      const countRow = await countStmt.bind(...countParams).first<{ count: number }>()

      const ftsStmt = db.prepare(`
        SELECT r.*, c.title as canon_title, c.category, c.year, c.resolution, c.codec, c.audio, c.edition, c.normalized_key, c.metadata as canon_metadata
        FROM resources r
        LEFT JOIN canonical_resources c ON r.canonical_id = c.id
        WHERE ${whereFts}
        ${filterSql}
        LIMIT 200
      `)
      const params: unknown[] = []
      bindFilters(params)

      const { results } = await ftsStmt.bind(...params).all<any>()
      const resources: Resource[] = (results || []).map((r: any) => mapDbResource(r)).filter((r: Resource) => {
        return !isResourceBlocked({ title: r.title, url: r.url || undefined, infohash: r.infohash || undefined }, blocked)
      })

      const canonicalsMap = new Map<string, CanonicalResource>()
      for (const row of results || []) {
        if (row.canonical_id && !canonicalsMap.has(row.canonical_id)) {
          let canonMeta: any = {}
          try { canonMeta = typeof row.canon_metadata === 'string' ? JSON.parse(row.canon_metadata) : (row.canon_metadata || {}) } catch {}
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
            posterUrl: canonMeta.posterUrl || null,
            backdropUrl: canonMeta.backdropUrl || null,
            metadata: canonMeta,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          })
        }
      }

      const scored = rankResources(resources, query)
      const aggregated = aggregateResourcesToCanonical(scored, canonicalsMap)
      sortCanonical(aggregated, query.sort)
      const paginated = aggregated.slice(offset, offset + limit)

      return {
        items: paginated,
        total: aggregated.length || countRow?.count || 0,
        latencyMs: Date.now() - start
      }
    } catch {
      return {
        items: [],
        total: 0,
        latencyMs: Date.now() - start
      }
    }
  }

  // Memory/Local Fallback Search Engine with Ranking & Canonical Aggregation
  const parsedMeta = parseTitleMetadata(query.q)
  const keywords = query.q.toLowerCase().split(/\s+/).filter(Boolean)

  const allResources: Resource[] = (seedData.resources as any[]).map(r => ({
    ...r,
    canonicalId: r.canonicalId || r.canonical_id,
    status: r.status as any,
    resourceType: r.resourceType || r.resource_type
  }))

  const allCanonicals: CanonicalResource[] = (seedData.canonical_resources as any[])

  const canonicalsMap = new Map<string, CanonicalResource>()
  for (const c of allCanonicals) {
    canonicalsMap.set(c.id, c)
  }

  // Filter & Score matching resources
  const matched = allResources.filter(r => {
    // Keyword match (all terms match title, url, canonical title, or metadata specs)
    const titleLower = r.title.toLowerCase()
    const canon = canonicalsMap.get(r.canonicalId || '')
    const canonTitle = (canon?.title || '').toLowerCase()
    const canonRes = (canon?.resolution || '').toLowerCase()
    const resMeta = (typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : r.metadata) || {}
    const resResolution = ((resMeta as any)?.resolution || '').toLowerCase()

    const matchTerms = keywords.every(kw => {
      if (titleLower.includes(kw) || canonTitle.includes(kw)) return true
      if (kw === '2160p' && (titleLower.includes('4k') || canonRes === '2160p' || resResolution === '2160p')) return true
      if (kw === '4k' && (titleLower.includes('2160p') || canonRes === '2160p' || resResolution === '2160p')) return true
      if (kw === '1080p' && (titleLower.includes('1080') || canonRes === '1080p' || resResolution === '1080p')) return true
      if (canonRes === kw || resResolution === kw) return true
      return false
    })
    if (!matchTerms) return false

    // Type filter (supports single or multi-select)
    const selectedTypes = query.type && query.type !== 'all'
      ? String(query.type).split(',').map(t => t.trim()).filter(Boolean)
      : []
    if (selectedTypes.length > 0 && !selectedTypes.includes(r.resourceType)) return false

    // Category filter
    const selectedCategories = query.category && query.category !== 'all'
      ? String(query.category).split(',').map(c => c.trim()).filter(Boolean)
      : []
    if (selectedCategories.length > 0) {
      const canon = canonicalsMap.get(r.canonicalId || '')
      const resMeta = (typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : r.metadata) || {}
      const resCategory = canon?.category || (resMeta as any)?.category
      if (!resCategory || !selectedCategories.includes(resCategory)) return false
    }

    // Provider filter
    if (query.provider && query.provider !== 'all' && r.provider !== query.provider) return false

    // Status filter
    if (query.status && query.status !== 'all' && r.status !== query.status) return false

    // Resolution filter
    if (query.resolution && query.resolution !== 'all') {
      const canon = canonicalsMap.get(r.canonicalId || '')
      const resMeta = (r.metadata as any)?.resolution || canon?.resolution
      if (resMeta !== query.resolution) return false
    }

    // Size filter
    if (query.minSize !== undefined && query.minSize > 0 && r.sizeBytes && r.sizeBytes < query.minSize) return false
    if (query.maxSize !== undefined && query.maxSize > 0 && r.sizeBytes && r.sizeBytes > query.maxSize) return false

    // Blacklist filter
    if (isResourceBlocked({ title: r.title, url: r.url || undefined, infohash: r.infohash || undefined }, blocked)) return false

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

function parseJsonSafe(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw !== 'string' || !raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function mapDbResource(r: any): Resource {
  return {
    id: r.id,
    canonicalId: r.canonical_id,
    title: r.title,
    normalizedTitle: r.normalized_title,
    resourceType: r.resource_type,
    provider: r.provider,
    url: r.url,
    urlHash: r.url_hash,
    infohash: r.infohash,
    password: r.password,
    sizeBytes: r.size_bytes,
    fileCount: r.file_count,
    sourceId: r.source_id,
    publishedAt: r.published_at,
    discoveredAt: r.discovered_at,
    lastSeenAt: r.last_seen_at,
    status: r.status,
    qualityScore: r.quality_score,
    popularityScore: r.popularity_score,
    metadata: parseJsonSafe(r.metadata),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

function rankResources(resources: Resource[], query: SearchQuery): Array<Resource & { rankScore: number }> {
  const q = query.q.toLowerCase()
  const keywords = q.split(/\s+/).filter(Boolean)
  return resources.map(r => {
    const titleLower = r.title.toLowerCase()
    let relevance = 0.5
    if (titleLower.includes(q)) relevance = 1.0
    else if (keywords.some(k => titleLower.includes(k))) relevance = 0.8
    return { ...r, rankScore: calculateCompositeRank(r, relevance, 1.0) }
  })
}

function sortCanonical(items: CanonicalResource[], sort?: SearchQuery['sort']) {
  if (sort === 'freshness') {
    items.sort((a, b) => (b.latestDiscoveredAt || 0) - (a.latestDiscoveredAt || 0))
  } else if (sort === 'size_desc') {
    items.sort((a, b) => (b.maxSizeBytes || 0) - (a.maxSizeBytes || 0))
  } else if (sort === 'size_asc') {
    items.sort((a, b) => (a.minSizeBytes || 0) - (b.minSizeBytes || 0))
  } else if (sort === 'sources') {
    items.sort((a, b) => (b.sourceCount || 0) - (a.sourceCount || 0))
  } else {
    items.sort((a, b) => {
      const aScore = Math.max(0, ...(a.resources || []).map(r => r.qualityScore || 0))
      const bScore = Math.max(0, ...(b.resources || []).map(r => r.qualityScore || 0))
      return bScore - aScore
    })
  }
}
