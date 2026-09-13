import { initializeSources } from '../sources'
import { processCrawlJob } from '../queues/crawl-consumer'
import { evaluateAllSources } from '../core/health/source-evaluator'
import type { D1DatabaseLike } from './db'

/**
 * Handles periodic Cron triggers dispatched by Cloudflare Workers / Queues.
 * Enqueues one crawl job per enabled adapter. If no queue binding exists,
 * jobs run inline (local / Pages without a consumer worker).
 */
export async function handleCronScheduler(env: any): Promise<{ enqueued: number; processed: number; evaluations?: number }> {
  const registry = initializeSources()
  const crawlAdapters = registry.getCrawlAdapters()
  let enqueued = 0
  let processed = 0
  let evaluations = 0

  const db: D1DatabaseLike | undefined = env?.DB
  const queue = env?.CRAWL_QUEUE

  for (const adapter of crawlAdapters) {
    let isEnabled = true
    if (db) {
      try {
        const row = await db.prepare('SELECT enabled FROM sources WHERE source_key = ?')
          .bind(adapter.id)
          .first<{ enabled: number }>()
        if (row && row.enabled === 0) isEnabled = false
      } catch {
        // Source table may be empty on first run
      }
    }

    if (!isEnabled) continue

    const job = {
      type: 'crawl_source' as const,
      sourceId: adapter.id,
      cursor: undefined,
      attempt: 0
    }

    if (queue) {
      try {
        await queue.send(job)
        enqueued++
      } catch {
        await processCrawlJob(job, env)
        processed++
      }
    } else {
      await processCrawlJob(job, env)
      processed++
    }
  }

  if (db) {
    try {
      const evalSummaries = await evaluateAllSources(db)
      evaluations = evalSummaries.length
    } catch {
      // Evaluation is non-blocking to crawl tasks
    }
  }

  return { enqueued, processed, evaluations }
}
