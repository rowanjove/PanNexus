import { defineEventHandler, getRouterParam, createError } from 'h3'
import type { CanonicalResource, Resource } from '~/shared/types'
import { getDatabase } from '../../../utils/db'
import { seedData } from '../../../data/seed'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Resource ID is required' })
  }

  const db = getDatabase(event)

  if (db) {
    try {
      // Query canonical resource
      const canon = await db
        .prepare('SELECT * FROM canonical_resources WHERE id = ?')
        .bind(id)
        .first<CanonicalResource>()

      if (canon) {
        // Query associated resources
        const { results: resources } = await db
          .prepare('SELECT * FROM resources WHERE canonical_id = ? ORDER BY quality_score DESC')
          .bind(id)
          .all<Resource>()

        // Query files for these resources
        const resIds = resources.map(r => r.id)
        let files: any[] = []
        if (resIds.length > 0) {
          const placeholders = resIds.map(() => '?').join(',')
          const { results: fResults } = await db
            .prepare(`SELECT * FROM resource_files WHERE resource_id IN (${placeholders})`)
            .bind(...resIds)
            .all<any>()
          files = fResults
        }

        return {
          canonical: canon,
          resources: resources.map(r => ({
            ...r,
            metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : r.metadata,
            files: files.filter(f => f.resource_id === r.id)
          }))
        }
      }
    } catch {
      // Fallback to memory
    }
  }

  // Memory fallback lookup
  const allCanonicals = seedData.canonical_resources as CanonicalResource[]
  const canon = allCanonicals.find(c => c.id === id)

  if (!canon) {
    // Check if ID matches a resource directly
    const resId = parseInt(id, 10)
    const res = (seedData.resources as any[]).find(r => r.id === resId)
    if (!res) {
      throw createError({ statusCode: 404, message: 'Resource not found' })
    }
    return {
      canonical: {
        id: `virtual-${res.id}`,
        title: res.title,
        normalizedKey: 'virtual',
        createdAt: res.createdAt,
        updatedAt: res.updatedAt
      },
      resources: [res]
    }
  }

  const resources = (seedData.resources as any[]).filter(r => r.canonical_id === id)

  return {
    canonical: canon,
    resources
  }
})
