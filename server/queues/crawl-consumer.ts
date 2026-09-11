import { initializeSources } from '../sources'
import { parseTitleMetadata } from '../core/normalize/title'
import { inferProviderAndType, calculateUrlHash } from '../core/dedup'
import { buildCanonicalFromResource } from '../core/canonical/cluster'
import type { D1DatabaseLike } from '../utils/db'

export interface CrawlJob {
  type: 'crawl_source'
  sourceId: string
  cursor?: string
  attempt?: number
}

/**
 * Core queue consumer: processes a single crawl job, cleanses data, deduplicates,
 * and upserts results into Cloudflare D1 with automatic FTS5 synchronization.
 */
export async function processCrawlJob(job: CrawlJob, env?: any): Promise<{ inserted: number; nextCursor?: string }> {
  const registry = initializeSources()
  const adapter = registry.get(job.sourceId)

  if (!adapter) {
    return { inserted: 0 }
  }

  const crawlResult = await adapter.executeCrawl(job.cursor)
  const items = crawlResult.items || []
  let inserted = 0
  const now = Date.now()

  const db: D1DatabaseLike | undefined = env?.DB

  for (const raw of items) {
    if (!raw.title) continue

    const meta = parseTitleMetadata(raw.title)
    const { provider, resourceType } = inferProviderAndType(raw.url)
    const canonical = buildCanonicalFromResource(raw.title)
    const urlHash = raw.url ? calculateUrlHash(raw.url) : null

    if (db) {
      try {
        // Upsert canonical entity
        await db.prepare(`
          INSERT OR IGNORE INTO canonical_resources (id, title, original_title, category, year, resolution, codec, audio, edition, normalized_key, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          canonical.id,
          canonical.title,
          canonical.originalTitle || null,
          canonical.category || null,
          canonical.year || null,
          canonical.resolution || null,
          canonical.codec || null,
          canonical.audio || null,
          canonical.edition || null,
          canonical.normalizedKey,
          now,
          now
        ).run()

        // Upsert resource (with URL deduplication on url_hash)
        await db.prepare(`
          INSERT INTO resources (canonical_id, title, normalized_title, resource_type, provider, url, url_hash, infohash, password, size_bytes, file_count, discovered_at, last_seen_at, status, quality_score, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          canonical.id,
          raw.title,
          meta.normalizedTitle,
          raw.resourceType || resourceType,
          raw.provider || provider,
          raw.url || null,
          urlHash,
          raw.infohash || null,
          raw.password || null,
          raw.size || null,
          raw.fileCount || 1,
          now,
          now,
          'active',
          0.95,
          JSON.stringify(raw.metadata || {}),
          now,
          now
        ).run()

        inserted++
      } catch {
        // Skip duplicate or conflicted items gracefully
      }
    } else {
      inserted++
    }
  }

  // Update source crawl timestamp
  if (db) {
    try {
      await db.prepare(`
        UPDATE sources SET
          last_crawl_at = ?,
          success_count = success_count + 1
        WHERE source_key = ?
      `).bind(now, job.sourceId).run()
    } catch {}
  }

  // If nextCursor exists and queue is present, dispatch next page
  if (crawlResult.nextCursor && env?.CRAWL_QUEUE) {
    try {
      await env.CRAWL_QUEUE.send({
        type: 'crawl_source',
        sourceId: job.sourceId,
        cursor: crawlResult.nextCursor,
        attempt: (job.attempt || 0) + 1
      })
    } catch {}
  }

  return {
    inserted,
    nextCursor: crawlResult.nextCursor
  }
}
