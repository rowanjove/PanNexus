import type { CanonicalResource, Resource, Provider } from '~/shared/types'
import { parseTitleMetadata } from '../normalize/title'

export interface ClusterInput {
  title: string
  url?: string
  infohash?: string
  metadata?: Record<string, unknown>
}

/**
 * Creates or computes canonical metadata for grouping multiple sources.
 */
export function buildCanonicalFromResource(title: string): Omit<CanonicalResource, 'createdAt' | 'updatedAt'> {
  const meta = parseTitleMetadata(title)

  // Generate canonical ID
  const slugTitle = meta.title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'

  const canonicalId = `canon-${slugTitle}-${meta.cleanKey}`

  return {
    id: canonicalId,
    title: meta.title,
    originalTitle: meta.normalizedTitle,
    category: meta.category,
    year: meta.year,
    season: meta.season,
    episode: meta.episode,
    resolution: meta.resolution,
    codec: meta.codec,
    audio: meta.audio,
    edition: meta.edition,
    normalizedKey: meta.cleanKey,
    metadata: {
      hdr: meta.hdr
    }
  }
}

/**
 * Aggregates a list of Resource rows into clustered CanonicalResource objects for UI display.
 */
export function aggregateResourcesToCanonical(
  resources: Resource[],
  canonicalsMap: Map<string, CanonicalResource>
): CanonicalResource[] {
  const grouped = new Map<string, Resource[]>()

  for (const res of resources) {
    const key = res.canonicalId || `virtual-${res.id}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(res)
  }

  const result: CanonicalResource[] = []

  for (const [canonId, resList] of grouped.entries()) {
    let canonical = canonicalsMap.get(canonId)

    if (!canonical) {
      // Fallback: build from first resource title
      const first = resList[0]
      const built = buildCanonicalFromResource(first.title)
      canonical = {
        ...built,
        createdAt: first.createdAt,
        updatedAt: first.updatedAt
      }
    }

    // Provider statistics
    const providerCounts: Record<string, number> = {}
    let minSize: number | null = null
    let maxSize: number | null = null
    let latestDiscovered = 0

    for (const r of resList) {
      providerCounts[r.provider] = (providerCounts[r.provider] || 0) + 1

      if (r.sizeBytes && r.sizeBytes > 0) {
        if (minSize === null || r.sizeBytes < minSize) minSize = r.sizeBytes
        if (maxSize === null || r.sizeBytes > maxSize) maxSize = r.sizeBytes
      }

      if (r.discoveredAt && r.discoveredAt > latestDiscovered) {
        latestDiscovered = r.discoveredAt
      }
    }

    result.push({
      ...canonical,
      resources: resList,
      sourceCount: resList.length,
      providerCounts: providerCounts as Record<Provider, number>,
      minSizeBytes: minSize,
      maxSizeBytes: maxSize,
      latestDiscoveredAt: latestDiscovered || Date.now()
    })
  }

  return result
}
