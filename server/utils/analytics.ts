import type { H3Event } from 'h3'
import { getDatabase } from './db'

/**
 * Asynchronously logs search analytics and records zero-result queries.
 * Non-blocking: leverages Cloudflare ExecutionContext waitUntil if available.
 */
export function recordSearchAnalytics(event: H3Event | undefined, rawQuery: string, hitCount: number) {
  const query = rawQuery.trim()
  if (!query) return

  const task = async () => {
    const db = getDatabase(event)
    if (!db) return

    const now = Date.now()

    try {
      if (hitCount > 0) {
        // Increment search analytics counter
        await db.prepare(`
          INSERT INTO search_analytics (query, count, last_searched_at)
          VALUES (?, 1, ?)
          ON CONFLICT(query) DO UPDATE SET
            count = count + 1,
            last_searched_at = excluded.last_searched_at
        `).bind(query, now).run()
      } else {
        // Record zero result keyword
        await db.prepare(`
          INSERT INTO zero_result_queries (query, count, last_searched_at)
          VALUES (?, 1, ?)
          ON CONFLICT(query) DO UPDATE SET
            count = count + 1,
            last_searched_at = excluded.last_searched_at
        `).bind(query, now).run()
      }
    } catch {
      // Non-critical logging: suppress silently
    }
  }

  // Use CF waitUntil if present, else execute unawaited
  const cfCtx = (event?.context as any)?.cloudflare?.ctx
  if (cfCtx?.waitUntil) {
    cfCtx.waitUntil(task())
  } else {
    task().catch(() => {})
  }
}
