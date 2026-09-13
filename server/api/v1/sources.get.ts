import { defineEventHandler } from 'h3'
import { initializeSources } from '../../sources'
import { getDatabase } from '../../utils/db'
import { seedData } from '../../data/seed'

export default defineEventHandler(async (event) => {
  const registry = initializeSources()
  const db = getDatabase(event)

  const dbRows = new Map<string, any>()
  if (db) {
    try {
      const { results } = await db.prepare('SELECT * FROM sources ORDER BY priority DESC').all<any>()
      for (const row of results || []) {
        dbRows.set(row.source_key, row)
      }
    } catch {}
  }

  const seedByKey = new Map(seedData.sources.map(s => [s.sourceKey, s]))

  return registry.getAll().map((adapter, index) => {
    const dbRow = dbRows.get(adapter.id)
    const seed = seedByKey.get(adapter.id)
    return {
      id: dbRow?.id || seed?.id || index + 1,
      sourceKey: adapter.id,
      name: adapter.name,
      type: adapter.type,
      enabled: dbRow ? Boolean(dbRow.enabled) : Boolean(adapter.capabilities.search || adapter.capabilities.crawl),
      priority: adapter.priority,
      healthScore: typeof dbRow?.health_score === 'number' ? dbRow.health_score : adapter.circuitBreaker.getHealthScore(),
      avgLatency: adapter.circuitBreaker.avgLatencyMs || dbRow?.avg_latency || seed?.avgLatency || 0,
      circuitState: dbRow?.circuit_state || adapter.circuitBreaker.state,
      liveSearch: Boolean(adapter.capabilities.search),
      liveCrawl: Boolean(adapter.capabilities.crawl),
      lastCrawlAt: dbRow?.last_crawl_at || null
    }
  }).sort((a, b) => b.priority - a.priority)
})
