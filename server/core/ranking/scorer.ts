import type { Resource, ResourceStatus } from '~/shared/types'

export interface RankingWeights {
  relevance: number
  freshness: number
  sourceQuality: number
  availability: number
  metadataQuality: number
  popularity: number
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  relevance: 0.35,
  freshness: 0.20,
  sourceQuality: 0.15,
  availability: 0.10,
  metadataQuality: 0.10,
  popularity: 0.10
}

/**
 * Calculates freshness score (0.0 ~ 1.0) based on timestamp.
 */
export function calculateFreshnessScore(timestamp?: number | null): number {
  if (!timestamp) return 0.3
  const now = Date.now()
  const diffHours = Math.max(0, (now - timestamp) / (1000 * 60 * 60))

  if (diffHours <= 24) return 1.0
  if (diffHours <= 24 * 7) return 0.85
  if (diffHours <= 24 * 30) return 0.65
  if (diffHours <= 24 * 180) return 0.40
  return 0.20
}

/**
 * Calculates availability score (0.0 ~ 1.0) based on link status.
 */
export function calculateAvailabilityScore(status: ResourceStatus): number {
  switch (status) {
    case 'active':
      return 1.0
    case 'unknown':
      return 0.65
    case 'stale':
      return 0.30
    case 'dead':
    case 'locked':
      return 0.0
    default:
      return 0.5
  }
}

/**
 * Calculates metadata richness score (0.0 ~ 1.0).
 */
export function calculateMetadataQualityScore(res: Partial<Resource>): number {
  let score = 0.2 // baseline

  if (res.sizeBytes && res.sizeBytes > 0) score += 0.25
  if (res.fileCount && res.fileCount > 1) score += 0.15
  if (res.infohash) score += 0.20
  if (res.password !== undefined && res.password !== null) score += 0.10
  if (res.metadata && Object.keys(res.metadata).length > 0) score += 0.10

  return Math.min(1.0, score)
}

/**
 * Calculates composite ranking score for a resource.
 */
export function calculateCompositeRank(
  res: Partial<Resource>,
  relevanceScore = 1.0,
  sourceQuality = 1.0,
  weights: RankingWeights = DEFAULT_WEIGHTS
): number {
  const freshness = calculateFreshnessScore(res.lastSeenAt || res.discoveredAt || res.publishedAt)
  const availability = calculateAvailabilityScore(res.status || 'unknown')
  const metadataQuality = calculateMetadataQualityScore(res)
  const popularity = Math.min(1.0, (res.popularityScore || 0) / 100)

  const finalScore =
    relevanceScore * weights.relevance +
    freshness * weights.freshness +
    sourceQuality * weights.sourceQuality +
    availability * weights.availability +
    metadataQuality * weights.metadataQuality +
    popularity * weights.popularity

  return Number(finalScore.toFixed(4))
}
