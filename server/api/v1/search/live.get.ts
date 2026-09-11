import { defineEventHandler, getQuery, createEventStream } from 'h3'
import { initializeSources } from '../../../sources'
import type { SearchQuery } from '~/shared/types'
import { buildCanonicalFromResource } from '../../../core/canonical/cluster'
import { inferProviderAndType } from '../../../core/dedup'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim()

  const eventStream = createEventStream(event)
  const registry = initializeSources()
  const adapters = registry.getSearchAdapters()

  // Run in background and stream chunks to SSE
  ;(async () => {
    try {
      const searchQuery: SearchQuery = { q }

      for (const adapter of adapters) {
        // Stream status update
        await eventStream.push({
          event: 'source_start',
          data: JSON.stringify({ sourceId: adapter.id, sourceName: adapter.name })
        })

        const rawItems = await adapter.executeSearch(searchQuery)

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
      }

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
