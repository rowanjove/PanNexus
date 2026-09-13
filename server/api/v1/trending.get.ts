import { defineEventHandler, setResponseHeader } from 'h3'
import { getDatabase } from '../../utils/db'
import { initializeSources } from '../../sources'
import { seedData } from '../../data/seed'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')

  const db = getDatabase(event)
  const registry = initializeSources()
  const healthySources = registry.getAll().filter(a => a.circuitBreaker.state === 'closed').length

  if (db) {
    try {
      const { count: totalResources } = (await db
        .prepare('SELECT COUNT(*) as count FROM resources')
        .first<{ count: number }>()) || { count: 0 }

      const { count: totalCanonical } = (await db
        .prepare('SELECT COUNT(*) as count FROM canonical_resources')
        .first<{ count: number }>()) || { count: 0 }

      return {
        stats: {
          totalResources,
          totalCanonical,
          healthySources
        }
      }
    } catch {
      // Fall through
    }
  }

  return {
    stats: {
      totalResources: seedData.resources.length,
      totalCanonical: seedData.canonical_resources.length,
      healthySources
    }
  }
})
