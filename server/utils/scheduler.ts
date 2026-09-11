import { initializeSources } from '../sources'
import type { D1DatabaseLike } from './db'

/**
 * Handles periodic Cron triggers dispatched by Cloudflare Workers / Queues.
 */
export async function handleCronScheduler(env: any): Promise<{ enqueued: number }> {
  const registry = initializeSources()
  const crawlAdapters = registry.getCrawlAdapters()
  let enqueued = 0

  const db: D1DatabaseLike | undefined = env?.DB
  const queue = env?.CRAWL_QUEUE

  for (const adapter of crawlAdapters) {
    let isEnabled = true
    if (db) {
      try {
        const row = await db.prepare('SELECT enabled FROM sources WHERE source_key = ?')
          .bind(adapter.id)
          .first<{ enabled: number }>()
        if (row && row.enabled === 0) {
          isEnabled = false
        }
      } catch {}
    }

    if (!isEnabled) continue

    if (queue) {
      try {
        await queue.send({
          type: 'crawl_source',
          sourceId: adapter.id,
          cursor: undefined,
          attempt: 0
        })
        enqueued++
      } catch {}
    } else {
      enqueued++
    }
  }

  return { enqueued }
}
