import { defineEventHandler, getQuery, createEventStream } from 'h3'
import { initializeSources } from '../../../sources'
import type { SearchQuery } from '~/shared/types'
import { buildCanonicalFromResource } from '../../../core/canonical/cluster'
import { inferProviderAndType } from '../../../core/dedup'
import { getDatabase } from '../../../utils/db'
import { ingestRawResources } from '../../../core/ingest'
import { createD1IngestStore } from '../../../core/ingest/store'
import { isResourceBlocked } from '../../../core/ingest/blocked'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim().slice(0, 80)

  const eventStream = createEventStream(event)
  const registry = initializeSources()
  const db = getDatabase(event)
  let adapters = registry.getSearchAdapters()
  if (db) {
    try {
      const { results } = await db.prepare('SELECT source_key, enabled FROM sources').all<{ source_key: string; enabled: number }>()
      if (results && results.length > 0) {
        const disabled = new Set(results.filter(r => r.enabled === 0).map(r => r.source_key))
        adapters = adapters.filter(a => !disabled.has(a.id))
      }
    } catch {}
  }
  const store = db ? createD1IngestStore(db) : null
  const blocked = store ? await store.listBlocked() : []

  const category = query.category ? String(query.category) : undefined
  const type = query.type ? (query.type as any) : undefined
  const provider = query.provider ? (query.provider as any) : undefined

  ;(async () => {
    try {
      const searchQuery: SearchQuery = { q, category, type, provider }

      await Promise.all(adapters.map(async (adapter) => {
        try {
          await eventStream.push({
            event: 'source_start',
            data: JSON.stringify({ sourceId: adapter.id, sourceName: adapter.name })
          })

          const rawItems = (await adapter.executeSearch(searchQuery)).filter(item =>
            !isResourceBlocked({ title: item.title, url: item.url, infohash: item.infohash }, blocked)
          )

          // 1. Immediately stream resource items to client for 0-latency UI rendering
          for (const raw of rawItems) {
            const { provider, resourceType } = inferProviderAndType(raw.url)
            const canonical = buildCanonicalFromResource(raw.title)

            await eventStream.push({
              event: 'resource',
              data: JSON.stringify({
                rawResource: {
                  ...raw,
                  provider: raw.provider || provider,
                  resourceType: raw.resourceType || resourceType,
                  discoveredAt: Date.now(),
                  lastSeenAt: Date.now(),
                  status: 'active'
                },
                canonical
              })
            })
          }

          await eventStream.push({
            event: 'source_done',
            data: JSON.stringify({ sourceId: adapter.id, count: rawItems.length })
          })

          // 2. Asynchronously ingest into D1 database in background without blocking SSE
          if (store && rawItems.length > 0) {
            const ingestPromise = ingestRawResources(rawItems, store, { sourceKey: adapter.id, event }).catch(() => {})
            if (typeof (event as any).waitUntil === 'function') {
              ;(event as any).waitUntil(ingestPromise)
            } else if ((event.context as any)?.cloudflare?.context?.waitUntil) {
              ;(event.context as any).cloudflare.context.waitUntil(ingestPromise)
            }
          }
        } catch {
          // Individual adapter failure must not abort other sources
        }
      }))

      await eventStream.push({
        event: 'complete',
        data: JSON.stringify({ message: 'All sources finished' })
      })
    } catch (err: any) {
      await eventStream.push({
        event: 'error',
        data: JSON.stringify({ error: err.message || 'Live search error' })
      })
    } finally {
      await eventStream.close()
    }
  })()

  return eventStream.send()
})
