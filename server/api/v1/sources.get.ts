import { defineEventHandler } from 'h3'
import { initializeSources } from '../../sources'
import { getDatabase } from '../../utils/db'
import { seedData } from '../../data/seed'

export default defineEventHandler(async (event) => {
  const registry = initializeSources()
  const db = getDatabase(event)

  if (db) {
    try {
      const { results } = await db.prepare('SELECT * FROM sources ORDER BY priority DESC').all()
      if (results && results.length > 0) {
        return results
      }
    } catch {
      // Fallback
    }
  }

  // Combine registered adapters with memory seed
  const registered = registry.getAll()
  const list = seedData.sources.map(s => {
    const adapter = registered.find(a => a.id === s.sourceKey)
    return {
      ...s,
      healthScore: adapter ? adapter.circuitBreaker.getHealthScore() : s.healthScore,
      circuitState: adapter ? adapter.circuitBreaker.state : s.circuitState,
      avgLatency: adapter && adapter.circuitBreaker.avgLatencyMs > 0 ? adapter.circuitBreaker.avgLatencyMs : s.avgLatency
    }
  })

  return list
})
