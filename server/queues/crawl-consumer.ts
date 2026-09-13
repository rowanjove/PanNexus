import { initializeSources } from '../sources'
import { ingestRawResources } from '../core/ingest'
import { createD1IngestStore } from '../core/ingest/store'
import type { D1DatabaseLike } from '../utils/db'

export interface CrawlJob {
  type: 'crawl_source'
  sourceId: string
  cursor?: string
  attempt?: number
}

const MAX_ATTEMPTS = 3

export async function processCrawlJob(job: CrawlJob, env?: any): Promise<{ inserted: number; updated: number; skipped: number; fetched: number; nextCursor?: string }> {
  const registry = initializeSources()
  const adapter = registry.get(job.sourceId)
  const empty = { inserted: 0, updated: 0, skipped: 0 as number, fetched: 0, nextCursor: undefined as string | undefined }

  if (!adapter) return empty

  const db: D1DatabaseLike | undefined = env?.DB
  const store = db ? createD1IngestStore(db) : null
  const started = Date.now()

  try {
    const crawlResult = await adapter.executeCrawl(job.cursor)
    const items = crawlResult.items || []

    let stats = { inserted: 0, updated: 0, skipped: 0 }
    if (store) {
      stats = await ingestRawResources(items, store, { sourceKey: job.sourceId })
      await store.touchSource(job.sourceId, true, Date.now() - started, adapter.circuitBreaker.state)
    }

    if (crawlResult.nextCursor && env?.CRAWL_QUEUE) {
      await env.CRAWL_QUEUE.send({
        type: 'crawl_source',
        sourceId: job.sourceId,
        cursor: crawlResult.nextCursor,
        attempt: 0
      })
    }

    return { ...stats, fetched: items.length, nextCursor: crawlResult.nextCursor }
  } catch (err: any) {
    if (store) {
      await store.touchSource(job.sourceId, false, Date.now() - started, adapter.circuitBreaker.state)
    }

    const attempt = job.attempt || 0
    if (attempt + 1 < MAX_ATTEMPTS && env?.CRAWL_QUEUE) {
      await env.CRAWL_QUEUE.send({
        type: 'crawl_source',
        sourceId: job.sourceId,
        cursor: job.cursor,
        attempt: attempt + 1
      })
    } else if (store) {
      await store.recordFailedJob(
        job.sourceId,
        err?.message || 'crawl failed',
        JSON.stringify({ cursor: job.cursor, attempt })
      )
    }

    return empty
  }
}
