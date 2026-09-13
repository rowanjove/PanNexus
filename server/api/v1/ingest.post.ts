import { defineEventHandler, readBody } from 'h3'
import type { RawResource } from '~/shared/types'
import { getDatabase } from '../../utils/db'
import { assertIngest } from '../../utils/admin-auth'
import { ingestRawResources } from '../../core/ingest'
import { createD1IngestStore, MemoryIngestStore } from '../../core/ingest/store'

export default defineEventHandler(async (event) => {
  assertIngest(event)

  const body = await readBody(event)
  const items: RawResource[] = (Array.isArray(body?.resources) ? body.resources : body ? [body] : []).slice(0, 100)

  if (items.length === 0) {
    return { success: true, received: 0, inserted: 0, updated: 0, skipped: 0 }
  }

  const db = getDatabase(event)
  const store = db ? createD1IngestStore(db) : new MemoryIngestStore()
  const stats = await ingestRawResources(items, store, { sourceKey: body?.sourceKey, event })

  return {
    success: true,
    ...stats,
    persisted: Boolean(db)
  }
})
