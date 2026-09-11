import { describe, it, expect } from 'vitest'
import {
  evaluateSourceQuality,
  calculateUniqueRatio,
  calculateLatencyScore
} from '../../server/core/health/quality-scorer'

describe('Source Quality Scorer & Unique Ratio Model', () => {
  it('calculates latency score accurately across response times', () => {
    expect(calculateLatencyScore(150)).toBe(1.0)
    expect(calculateLatencyScore(200)).toBe(1.0)
    expect(calculateLatencyScore(1100)).toBeCloseTo(0.55, 1)
    expect(calculateLatencyScore(2500)).toBe(0.1)
  })

  it('evaluates high-performing source into P0 tier', () => {
    const evaluation = evaluateSourceQuality({
      validRate: 0.95,
      successRate: 0.98,
      freshness: 0.90,
      uniqueRatio: 0.85,
      metaQuality: 0.90,
      avgLatencyMs: 180
    })

    expect(evaluation.qualityScore).toBeGreaterThanOrEqual(0.80)
    expect(evaluation.tier).toBe('P0')
    expect(evaluation.recommendedAction).toBe('default_enabled')
  })

  it('evaluates degraded / duplicated source into P2 / P3 tier', () => {
    const evaluation = evaluateSourceQuality({
      validRate: 0.40,
      successRate: 0.50,
      freshness: 0.30,
      uniqueRatio: 0.15, // High duplication (85% duplicates)
      metaQuality: 0.20,
      avgLatencyMs: 1800
    })

    expect(evaluation.qualityScore).toBeLessThan(0.40)
    expect(evaluation.tier).toBe('P3')
    expect(evaluation.recommendedAction).toBe('disabled')
  })

  it('computes unique ratio between newly crawled hashes and database', () => {
    const existingSet = new Set(['hash_1', 'hash_2', 'hash_3', 'hash_4'])
    const newHashes = ['hash_3', 'hash_4', 'hash_5', 'hash_6', 'hash_7'] // 3 unique out of 5

    const ratio = calculateUniqueRatio(newHashes, existingSet)
    expect(ratio).toBe(3 / 5) // 0.6
  })
})
