import type { RawResource } from '~/shared/types'
import { parseTitleMetadata } from '../normalize/title'
import { calculateUrlHash, inferProviderAndType, parseMagnetInfohash } from '../dedup'
import { buildCanonicalFromResource } from '../canonical/cluster'
import { resolveCanonicalMetadata } from '../canonical/tmdb'
import { calculateCompositeRank } from '../ranking/scorer'
import { isResourceBlocked } from './blocked'
import type { IngestStore, ResourceRow } from './store'

export interface IngestOptions {
  sourceKey?: string
  event?: unknown
}

export interface IngestResult {
  received: number
  inserted: number
  updated: number
  skipped: number
}

export async function ingestRawResources(
  items: RawResource[],
  store: IngestStore,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const blocked = await store.listBlocked()
  const sourceId = options.sourceKey ? await store.getSourceId(options.sourceKey) : null
  const result: IngestResult = { received: items.length, inserted: 0, updated: 0, skipped: 0 }

  for (const raw of items) {
    try {
    if (!raw.title) {
      result.skipped++
      continue
    }

    const inferred = inferProviderAndType(raw.url)
    const magnet = raw.url?.startsWith('magnet:?') ? parseMagnetInfohash(raw.url) : { trackers: [] as string[] }
    const infohash = (raw.infohash || magnet.infohash || '').toLowerCase() || null
    const urlHash = raw.url ? calculateUrlHash(raw.url) : null

    if (isResourceBlocked({ title: raw.title, url: raw.url, infohash: infohash || undefined }, blocked)) {
      result.skipped++
      continue
    }

    if (!raw.url && !infohash) {
      result.skipped++
      continue
    }

    const meta = parseTitleMetadata(raw.title)
    let canonical = buildCanonicalFromResource(raw.title)
    try {
      const resolved = await resolveCanonicalMetadata(raw.title, options.event as any)
      if (resolved) {
        canonical = {
          ...canonical,
          id: resolved.canonicalId,
          title: resolved.standardTitle,
          originalTitle: resolved.originalTitle || canonical.originalTitle,
          category: resolved.category || canonical.category,
          year: resolved.year || canonical.year
        }
      }
    } catch {
      // Dictionary / TMDB is optional
    }

    await store.upsertCanonical({
      id: canonical.id,
      title: canonical.title,
      originalTitle: canonical.originalTitle,
      category: canonical.category,
      year: canonical.year,
      resolution: canonical.resolution,
      codec: canonical.codec,
      audio: canonical.audio,
      edition: canonical.edition,
      normalizedKey: canonical.normalizedKey,
      metadata: JSON.stringify(canonical.metadata || {})
    })

    const provider = raw.provider || inferred.provider
    const resourceType = raw.resourceType || inferred.resourceType
    const qualityScore = calculateCompositeRank({
      title: raw.title,
      status: 'active',
      lastSeenAt: Date.now(),
      sizeBytes: raw.size,
      fileCount: raw.fileCount || raw.files?.length || 1,
      infohash,
      password: raw.password,
      metadata: raw.metadata,
      popularityScore: Number(raw.metadata?.seeders || 0)
    })

    const row: ResourceRow = {
      canonicalId: canonical.id,
      title: raw.title,
      normalizedTitle: meta.normalizedTitle,
      resourceType,
      provider,
      url: raw.url || (infohash ? `magnet:?xt=urn:btih:${infohash}` : null),
      urlHash,
      infohash,
      password: raw.password || null,
      sizeBytes: raw.size || null,
      fileCount: raw.fileCount || raw.files?.length || 1,
      sourceId,
      publishedAt: raw.publishedAt || null,
      qualityScore,
      metadata: JSON.stringify(raw.metadata || {})
    }

    const existingId = await store.findResourceId(urlHash, infohash)
    let resourceId: number
    if (existingId) {
      await store.updateResource(existingId, row)
      resourceId = existingId
      result.updated++
    } else {
      try {
        resourceId = await store.insertResource(row)
        result.inserted++
      } catch {
        const raced = await store.findResourceId(urlHash, infohash)
        if (!raced) throw new Error('insert failed')
        await store.updateResource(raced, row)
        resourceId = raced
        result.updated++
      }
    }

    if (resourceId && raw.files && raw.files.length > 0) {
      await store.replaceFiles(resourceId, raw.files)
    }
    } catch {
      result.skipped++
    }
  }

  if (result.inserted > 0 || result.updated > 0) {
    try {
      const { invalidateSearchCache } = await import('../../utils/cache')
      await invalidateSearchCache(undefined, options.event as any)
    } catch {
      // Invalidation failure non-blocking
    }
  }

  return result
}
