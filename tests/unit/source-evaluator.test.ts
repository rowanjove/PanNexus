import { describe, it, expect } from 'vitest'
import { evaluateAllSources } from '../../server/core/health/source-evaluator'
import type { D1DatabaseLike } from '../../server/utils/db'

class MockD1Database implements D1DatabaseLike {
  public sources: any[] = []
  public resources: any[] = []
  public updates: any[] = []

  constructor(sources: any[], resources: any[] = []) {
    this.sources = sources
    this.resources = resources
  }

  prepare(query: string) {
    const trimmed = query.trim().toUpperCase()
    return {
      bind: (...args: any[]) => {
        if (trimmed.startsWith('UPDATE SOURCES')) {
          this.updates.push({ query, args })
          const score = args[0]
          const id = args[args.length - 1]
          const source = this.sources.find(s => s.id === id)
          if (source) {
            source.health_score = score
            if (trimmed.includes('ENABLED = 0')) {
              source.enabled = 0
            }
          }
        }
        return this.prepare(query)
      },
      all: async () => {
        if (trimmed.includes('FROM SOURCES')) {
          return { results: this.sources, success: true }
        }
        if (trimmed.includes('FROM RESOURCES')) {
          return { results: this.resources, success: true }
        }
        return { results: [], success: true }
      },
      first: async () => null,
      run: async () => ({ success: true })
    }
  }
}

describe('Source Evaluator Lifecycle & Auto-Degrade', () => {
  it('evaluates healthy sources and retains active status', async () => {
    const mockDb = new MockD1Database([
      {
        id: 1,
        source_key: 'tg_aliyun',
        name: '阿里 4K 频道',
        enabled: 1,
        priority: 85,
        health_score: 0.95,
        avg_latency: 180,
        success_count: 100,
        failure_count: 2
      }
    ], [
      { source_id: 1, url_hash: 'hash_1001' },
      { source_id: 1, url_hash: 'hash_1002' }
    ])

    const summaries = await evaluateAllSources(mockDb)
    expect(summaries.length).toBe(1)
    expect(summaries[0].newTier).toMatch(/P0|P1/)
    expect(summaries[0].actionTaken).not.toBe('degraded_disabled')
    expect(mockDb.sources[0].enabled).toBe(1)
  })

  it('auto-degrades and disables P3 source with high failure rate and high duplicates', async () => {
    const mockDb = new MockD1Database([
      {
        id: 2,
        source_key: 'failing_crawler',
        name: '失效低质源',
        enabled: 1,
        priority: 60,
        health_score: 0.5,
        avg_latency: 2800,
        success_count: 1,
        failure_count: 99
      },
      {
        id: 3,
        source_key: 'dominant_crawler',
        name: '主源',
        enabled: 1,
        priority: 90,
        health_score: 0.98,
        avg_latency: 150,
        success_count: 100,
        failure_count: 0
      }
    ], [
      // failing_crawler shares all hashes with dominant_crawler (0% unique)
      { source_id: 2, url_hash: 'shared_hash_1' },
      { source_id: 3, url_hash: 'shared_hash_1' },
      { source_id: 3, url_hash: 'unique_hash_2' }
    ])

    const summaries = await evaluateAllSources(mockDb)
    const failingSummary = summaries.find(s => s.sourceId === 2)
    expect(failingSummary).toBeDefined()
    expect(failingSummary!.newTier).toBe('P3')
    expect(failingSummary!.actionTaken).toBe('degraded_disabled')
    expect(mockDb.sources.find(s => s.id === 2)?.enabled).toBe(0)
  })
})
