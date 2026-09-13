import type { D1DatabaseLike } from '../../utils/db'
import {
  evaluateSourceQuality,
  calculateUniqueRatio,
  type SourceQualityEvaluation,
  type SourceQualityMetrics
} from './quality-scorer'

export interface SourceEvaluationSummary {
  sourceId: number
  sourceKey: string
  name: string
  oldTier?: string
  newTier: string
  qualityScore: number
  uniqueRatio: number
  actionTaken: 'retained' | 'degraded_disabled' | 'promoted'
  reason?: string
}

export async function evaluateAllSources(db: D1DatabaseLike): Promise<SourceEvaluationSummary[]> {
  const summaries: SourceEvaluationSummary[] = []

  // 1. Load all registered sources
  const { results: sourceRows } = await db.prepare(
    'SELECT id, source_key, name, enabled, priority, health_score, avg_latency, success_count, failure_count, config FROM sources'
  ).all<any>()

  if (!sourceRows || sourceRows.length === 0) {
    return summaries
  }

  // 2. Fetch resource hash distribution across all sources for global uniqueness comparison
  let allHashes: Array<{ source_id: number; url_hash: string }> = []
  try {
    const { results } = await db.prepare(
      'SELECT source_id, url_hash FROM resources WHERE url_hash IS NOT NULL'
    ).all<{ source_id: number; url_hash: string }>()
    allHashes = results || []
  } catch {
    // If resources query fails or empty, fallback gracefully
  }

  // Group url_hashes by source_id
  const hashesBySource = new Map<number, Set<string>>()
  const allOtherHashesBySource = new Map<number, Set<string>>()

  for (const item of allHashes) {
    if (!item.source_id || !item.url_hash) continue
    if (!hashesBySource.has(item.source_id)) {
      hashesBySource.set(item.source_id, new Set())
    }
    hashesBySource.get(item.source_id)!.add(item.url_hash)
  }

  // Pre-calculate other hashes set per source
  for (const [sourceId] of hashesBySource.entries()) {
    const otherSet = new Set<string>()
    for (const [otherId, set] of hashesBySource.entries()) {
      if (otherId !== sourceId) {
        for (const h of set) otherSet.add(h)
      }
    }
    allOtherHashesBySource.set(sourceId, otherSet)
  }

  // 3. Evaluate each source
  for (const source of sourceRows) {
    const sourceId = source.id
    const sourceHashes = Array.from(hashesBySource.get(sourceId) || [])
    const otherHashes = allOtherHashesBySource.get(sourceId) || new Set()

    const uniqueRatio = sourceHashes.length > 0
      ? calculateUniqueRatio(sourceHashes, otherHashes)
      : 0.85 // Default reasonable unique estimate for zero-index source

    const totalCalls = (source.success_count || 0) + (source.failure_count || 0)
    const successRate = totalCalls > 0
      ? Math.max(0, Math.min(1, (source.success_count || 0) / totalCalls))
      : 0.95

    const validRate = totalCalls > 0
      ? Math.max(0, Math.min(1, (source.success_count || 0) / totalCalls))
      : 0.90

    const freshness = successRate < 0.2 ? 0.2 : 0.85
    const metaQuality = successRate < 0.2 ? 0.3 : 0.80

    const avgLatencyMs = source.avg_latency || 250

    const metrics: SourceQualityMetrics = {
      validRate,
      successRate,
      freshness,
      uniqueRatio,
      metaQuality,
      avgLatencyMs
    }

    const evalResult: SourceQualityEvaluation = evaluateSourceQuality(metrics)
    let actionTaken: SourceEvaluationSummary['actionTaken'] = 'retained'
    let reason: string | undefined

    if (evalResult.tier === 'P3' || evalResult.recommendedAction === 'disabled') {
      // Auto-degrade & disable P3 source
      actionTaken = 'degraded_disabled'
      reason = `Auto-degraded to P3 (score: ${evalResult.qualityScore}) - low quality / high duplicates / failures`
      await db.prepare(
        'UPDATE sources SET enabled = 0, health_score = ?, priority = 20 WHERE id = ?'
      ).bind(evalResult.qualityScore, sourceId).run()
    } else {
      // Retain or promote
      if (evalResult.tier === 'P0' && source.priority < 85) {
        actionTaken = 'promoted'
        reason = `Promoted to P0 (score: ${evalResult.qualityScore})`
      }
      await db.prepare(
        'UPDATE sources SET health_score = ? WHERE id = ?'
      ).bind(evalResult.qualityScore, sourceId).run()
    }

    summaries.push({
      sourceId,
      sourceKey: source.source_key,
      name: source.name,
      newTier: evalResult.tier,
      qualityScore: evalResult.qualityScore,
      uniqueRatio: Math.round(uniqueRatio * 1000) / 1000,
      actionTaken,
      reason
    })
  }

  return summaries
}
