import { defineEventHandler } from 'h3'
import { getDatabase } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const db = getDatabase(event)

  if (db) {
    try {
      const { results: trending } = await db
        .prepare('SELECT query, count FROM search_analytics ORDER BY count DESC LIMIT 8')
        .all<{ query: string; count: number }>()

      const { count: totalResources } = (await db
        .prepare('SELECT COUNT(*) as count FROM resources')
        .first<{ count: number }>()) || { count: 0 }

      const { count: totalCanonical } = (await db
        .prepare('SELECT COUNT(*) as count FROM canonical_resources')
        .first<{ count: number }>()) || { count: 0 }

      return {
        trending: trending.map(t => t.query),
        stats: {
          totalResources,
          totalCanonical,
          healthySources: 8
        }
      }
    } catch {
      // Fall through to mock
    }
  }

  return {
    trending: ['流浪地球2', '黑神话悟空', '奥本海默', '沙丘2', '繁花', 'Photoshop 2024', 'VSCode 便携版', '星际穿越'],
    stats: {
      totalResources: 18420,
      totalCanonical: 4920,
      healthySources: 8
    }
  }
})
