import { defineEventHandler, readBody } from 'h3'
import { getDatabase } from '../../../utils/db'
import { initializeSources } from '../../../sources'
import { processCrawlJob } from '../../../queues/crawl-consumer'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const action = body?.action
  const db = getDatabase(event)

  if (action === 'get_overview') {
    let zeroResults: any[] = []
    let blockedItems: any[] = []

    if (db) {
      try {
        const { results: zResults } = await db
          .prepare('SELECT query, count, last_searched_at FROM zero_result_queries ORDER BY count DESC LIMIT 20')
          .all()
        zeroResults = zResults || []

        const { results: bResults } = await db
          .prepare('SELECT * FROM blocked_items ORDER BY id DESC LIMIT 50')
          .all()
        blockedItems = bResults || []
      } catch {}
    }

    // Default sample if database empty
    if (zeroResults.length === 0) {
      zeroResults = [
        { query: '三体 4K 60帧 未删减', count: 42, last_searched_at: Date.now() - 600000 },
        { query: 'GTA6 PC 破解版', count: 38, last_searched_at: Date.now() - 2100000 },
        { query: '现代操作系统 第五版 中文 pdf', count: 21, last_searched_at: Date.now() - 3600000 }
      ]
    }

    if (blockedItems.length === 0) {
      blockedItems = [
        { id: 1, type: 'domain', value: 'spam-malware-ads.com', reason: '垃圾推广站', created_at: Date.now() - 86400000 }
      ]
    }

    return {
      success: true,
      zeroResults,
      blockedItems
    }
  }

  if (action === 'trigger_crawl') {
    const sourceId = String(body?.sourceId || 'pan_index')
    const cfEnv = (event.context as any)?.cloudflare?.env
    const res = await processCrawlJob({ type: 'crawl_source', sourceId, cursor: undefined }, cfEnv)
    return {
      success: true,
      sourceId,
      inserted: res.inserted,
      nextCursor: res.nextCursor
    }
  }

  if (action === 'reset_circuit') {
    const registry = initializeSources()
    const sourceId = body?.sourceId
    if (sourceId && sourceId !== 'all') {
      const adapter = registry.get(sourceId)
      adapter?.circuitBreaker.reset()
    } else {
      registry.getAll().forEach(a => a.circuitBreaker.reset())
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
      try {
        await db.prepare('INSERT OR REPLACE INTO blocked_items (type, value, reason, created_at) VALUES (?, ?, ?, ?)')
          .bind(type, value, reason, Date.now())
          .run()
      } catch {}
    }

    return { success: true, value }
  }

  if (action === 'remove_blocked') {
    const id = body?.id
    if (id && db) {
      try {
        await db.prepare('DELETE FROM blocked_items WHERE id = ?').bind(id).run()
      } catch {}
    }
    return { success: true, id }
  }

  return { success: false, message: 'Unknown action' }
})
