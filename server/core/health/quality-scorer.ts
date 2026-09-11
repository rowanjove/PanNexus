export type SourceTier = 'P0' | 'P1' | 'P2' | 'P3'

export interface SourceQualityMetrics {
  validRate: number       // 0 ~ 1.0: 有效链接与结果占比
  successRate: number     // 0 ~ 1.0: 请求成功率
  freshness: number       // 0 ~ 1.0: 资源时效性得分 (越近期得分越高)
  uniqueRatio: number     // 0 ~ 1.0: 独占资源占比 (非重复率)
  metaQuality: number     // 0 ~ 1.0: 规格、文件树与元数据完备度
  avgLatencyMs: number    // 毫秒响应延迟
}

export interface SourceQualityEvaluation {
  qualityScore: number
  tier: SourceTier
  recommendedAction: 'default_enabled' | 'category_enabled' | 'deep_search_only' | 'disabled'
  breakdown: {
    validScore: number
    successScore: number
    freshnessScore: number
    uniqueScore: number
    metaScore: number
    latencyScore: number
  }
}

/**
 * Calculates latency score from 0.0 to 1.0.
 * Under 200ms = 1.0; 500ms = 0.8; 1000ms = 0.5; >= 2000ms = 0.1.
 */
export function calculateLatencyScore(latencyMs: number): number {
  if (latencyMs <= 200) return 1.0
  if (latencyMs >= 2000) return 0.1
  return Math.max(0.1, 1.0 - ((latencyMs - 200) / 1800) * 0.9)
}

/**
 * Calculates comprehensive quality score according to MetaSeek Quality Specification (§ 28).
 * Quality = 0.30*valid + 0.20*success + 0.15*freshness + 0.15*unique + 0.10*meta + 0.10*latency
 */
export function evaluateSourceQuality(metrics: SourceQualityMetrics): SourceQualityEvaluation {
  const valid = Math.max(0, Math.min(1, metrics.validRate))
  const success = Math.max(0, Math.min(1, metrics.successRate))
  const freshness = Math.max(0, Math.min(1, metrics.freshness))
  const unique = Math.max(0, Math.min(1, metrics.uniqueRatio))
  const meta = Math.max(0, Math.min(1, metrics.metaQuality))
  const latency = calculateLatencyScore(metrics.avgLatencyMs)

  const validScore = 0.30 * valid
  const successScore = 0.20 * success
  const freshnessScore = 0.15 * freshness
  const uniqueScore = 0.15 * unique
  const metaScore = 0.10 * meta
  const latencyScore = 0.10 * latency

  const qualityScore = Math.round((validScore + successScore + freshnessScore + uniqueScore + metaScore + latencyScore) * 1000) / 1000

  let tier: SourceTier = 'P3'
  let recommendedAction: SourceQualityEvaluation['recommendedAction'] = 'disabled'

  if (qualityScore >= 0.80) {
    tier = 'P0'
    recommendedAction = 'default_enabled'
  } else if (qualityScore >= 0.60) {
    tier = 'P1'
    recommendedAction = 'category_enabled'
  } else if (qualityScore >= 0.40) {
    tier = 'P2'
    recommendedAction = 'deep_search_only'
  } else {
    tier = 'P3'
    recommendedAction = 'disabled'
  }

  return {
    qualityScore,
    tier,
    recommendedAction,
    breakdown: {
      validScore: Math.round(validScore * 1000) / 1000,
      successScore: Math.round(successScore * 1000) / 1000,
      freshnessScore: Math.round(freshnessScore * 1000) / 1000,
      uniqueScore: Math.round(uniqueScore * 1000) / 1000,
      metaScore: Math.round(metaScore * 1000) / 1000,
      latencyScore: Math.round(latencyScore * 1000) / 1000
    }
  }
}

/**
 * Calculates Unique Ratio from an array of newly fetched resource URL hashes
 * against the existing database URL hash set.
 */
export function calculateUniqueRatio(
  newResourceHashes: string[],
  existingHashesSet: Set<string>
): number {
  if (newResourceHashes.length === 0) return 1.0
  let uniqueCount = 0
  for (const hash of newResourceHashes) {
    if (!existingHashesSet.has(hash)) {
      uniqueCount++
    }
  }
  return uniqueCount / newResourceHashes.length
}
