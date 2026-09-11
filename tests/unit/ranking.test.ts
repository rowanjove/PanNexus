import { describe, it, expect } from 'vitest'
import { calculateFreshnessScore, calculateAvailabilityScore, calculateCompositeRank } from '../../server/core/ranking/scorer'

describe('Ranking & Scoring Algorithm', () => {
  it('freshness decays appropriately over time', () => {
    const now = Date.now()
    const oneHourAgo = now - 3600 * 1000
    const twoWeeksAgo = now - 14 * 24 * 3600 * 1000

    expect(calculateFreshnessScore(oneHourAgo)).toBe(1.0)
    expect(calculateFreshnessScore(twoWeeksAgo)).toBe(0.65)
  })

  it('availability maps status accurately', () => {
    expect(calculateAvailabilityScore('active')).toBe(1.0)
    expect(calculateAvailabilityScore('unknown')).toBe(0.65)
    expect(calculateAvailabilityScore('stale')).toBe(0.30)
    expect(calculateAvailabilityScore('dead')).toBe(0.0)
  })

  it('calculates composite rank weighted score', () => {
    const res = {
      title: 'Test Movie',
      status: 'active' as const,
      lastSeenAt: Date.now(),
      sizeBytes: 15 * 1024 * 1024 * 1024,
      fileCount: 2,
      popularityScore: 80
    }

    const rank = calculateCompositeRank(res, 1.0, 1.0)
    expect(rank).toBeGreaterThan(0.8)
    expect(rank).toBeLessThanOrEqual(1.0)
  })
})
