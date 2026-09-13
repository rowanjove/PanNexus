import { defineEventHandler, readBody } from 'h3'
import { getDatabase } from '../../../utils/db'
import { initializeSources } from '../../../sources'
import { processCrawlJob } from '../../../queues/crawl-consumer'
import { assertAdmin } from '../../../utils/admin-auth'
import { getCloudflareEnv } from '../../../utils/env'
import { fetchDoubanHotKeywords } from '../../../core/trending/douban'
import { ingestRawResources } from '../../../core/ingest'
import { createD1IngestStore } from '../../../core/ingest/store'

export default defineEventHandler(async (event) => {
  assertAdmin(event)

  const body = await readBody(event)
  const action = body?.action
  const db = getDatabase(event)
  const cfEnv = getCloudflareEnv(event)

  if (action === 'get_overview') {
    let zeroResults: any[] = []
    let blockedItems: any[] = []
    let failedJobs: any[] = []

    if (db) {
      try {
        const { results: zResults } = await db
          .prepare('SELECT query, count, last_searched_at FROM zero_result_queries ORDER BY count DESC LIMIT 20')
          .all()
        zeroResults = (zResults || []).map((row: any) => ({
          ...row,
          lastSearched: row.last_searched_at ? new Date(row.last_searched_at).toLocaleString() : ''
        }))
      } catch {}

      try {
        const { results: bResults } = await db
          .prepare('SELECT * FROM blocked_items ORDER BY id DESC LIMIT 50')
          .all()
        blockedItems = bResults || []
      } catch {}

      try {
        const { results: fResults } = await db
          .prepare('SELECT * FROM failed_jobs ORDER BY id DESC LIMIT 20')
          .all()
        failedJobs = fResults || []
      } catch {}
    }

    const hotKeywords = await fetchDoubanHotKeywords(10)

    return {
      success: true,
      zeroResults,
      blockedItems,
      failedJobs,
      hotKeywords
    }
  }

  if (action === 'crawl_trending') {
    const keywords = await fetchDoubanHotKeywords(6)
    const registry = initializeSources()
    const searchAdapters = registry.getSearchAdapters()
    let totalIndexed = 0
    const store = db ? createD1IngestStore(db) : null

    if (store) {
      for (const kw of keywords) {
        for (const adapter of searchAdapters) {
          try {
            const raw = await adapter.executeSearch({ q: kw })
            if (raw.length > 0) {
              const res = await ingestRawResources(raw, store, { sourceKey: adapter.id, event })
              totalIndexed += res.inserted + res.updated
            }
          } catch {}
        }
      }
    }
    return { success: true, keywords, totalIndexed }
  }

  if (action === 'trigger_crawl') {
    const sourceId = String(body?.sourceId || '')
    if (sourceId === 'all') {
      const registry = initializeSources()
      let inserted = 0
      let updated = 0
      for (const adapter of registry.getCrawlAdapters()) {
        const res = await processCrawlJob({ type: 'crawl_source', sourceId: adapter.id }, cfEnv)
        inserted += res.inserted
        updated += res.updated
      }
      return { success: true, sourceId: 'all', inserted, updated }
    }
    const res = await processCrawlJob({ type: 'crawl_source', sourceId, cursor: undefined }, cfEnv)
    return {
      success: true,
      sourceId,
      inserted: res.inserted,
      updated: res.updated,
      nextCursor: res.nextCursor
    }
  }

  if (action === 'reset_circuit') {
    const registry = initializeSources()
    const sourceId = body?.sourceId
    if (sourceId && sourceId !== 'all') {
      registry.get(sourceId)?.circuitBreaker.reset()
    } else {
      registry.getAll().forEach(a => a.circuitBreaker.reset())
    }
    if (db) {
      try {
        if (sourceId && sourceId !== 'all') {
          await db.prepare("UPDATE sources SET circuit_state = 'closed' WHERE source_key = ?").bind(sourceId).run()
        } else {
          await db.prepare("UPDATE sources SET circuit_state = 'closed'").run()
        }
      } catch {}
    }
    return {
      success: true,
      message: 'Circuit breaker states reset to CLOSED'
    }
  }

  if (action === 'add_blocked') {
    const type = String(body?.type || 'keyword')
    const value = String(body?.value || '').trim()
    const reason = String(body?.reason || '手动屏蔽')

    if (!value) return { success: false, error: 'Value required' }

    if (db) {
      await db.prepare('INSERT OR REPLACE INTO blocked_items (type, value, reason, created_at) VALUES (?, ?, ?, ?)')
        .bind(type, value, reason, Date.now())
        .run()
    }

    return { success: true, value }
  }

  if (action === 'remove_blocked') {
    const id = body?.id
    if (id && db) {
      await db.prepare('DELETE FROM blocked_items WHERE id = ?').bind(id).run()
    }
    return { success: true, id }
  }

  if (action === 'retry_failed_job') {
    const id = Number(body?.id)
    if (!id || !db) return { success: false, error: 'Valid Job ID and DB required' }

    const job = await db.prepare('SELECT * FROM failed_jobs WHERE id = ?').bind(id).first<any>()
    if (!job) return { success: false, error: 'Job not found' }

    let parsedPayload: any = {}
    try {
      parsedPayload = JSON.parse(job.payload || '{}')
    } catch {}

    const res = await processCrawlJob({
      type: 'crawl_source',
      sourceId: job.source_key,
      cursor: parsedPayload.cursor,
      attempt: 0
    }, cfEnv)

    if (res.inserted > 0 || res.updated > 0 || res.fetched > 0) {
      await db.prepare('DELETE FROM failed_jobs WHERE id = ?').bind(id).run()
      return { success: true, retried: true, deleted: true, result: res }
    }

    return { success: true, retried: true, deleted: false, result: res }
  }

  if (action === 'delete_failed_job') {
    const id = Number(body?.id)
    if (id && db) {
      await db.prepare('DELETE FROM failed_jobs WHERE id = ?').bind(id).run()
    }
    return { success: true, id }
  }

  if (action === 'clear_failed_jobs') {
    if (db) {
      await db.prepare('DELETE FROM failed_jobs').run()
    }
    return { success: true }
  }

  return { success: false, message: 'Unknown action' }
})
