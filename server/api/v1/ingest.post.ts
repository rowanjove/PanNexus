import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import type { RawResource } from '~/shared/types'
import { getDatabase } from '../../utils/db'
import { parseTitleMetadata } from '../../core/normalize/title'
import { calculateUrlHash, inferProviderAndType } from '../../core/dedup'
import { buildCanonicalFromResource } from '../../core/canonical/cluster'

const INGEST_TOKEN = process.env.METASEEK_INGEST_TOKEN || 'metaseek_secret_ingest_token_2025'

export default defineEventHandler(async (event) => {
  const auth = getHeader(event, 'authorization')
  if (!auth || auth !== `Bearer ${INGEST_TOKEN}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized: Invalid Ingest Token' })
  }

  const body = await readBody(event)
  const items: RawResource[] = Array.isArray(body?.resources) ? body.resources : body ? [body] : []

  if (items.length === 0) {
    return { success: true, count: 0 }
  }

  const db = getDatabase(event)
  let inserted = 0

  for (const raw of items) {
    if (!raw.title) continue
    const meta = parseTitleMetadata(raw.title)
    const { provider, resourceType } = inferProviderAndType(raw.url)
    const canonical = buildCanonicalFromResource(raw.title)
    const urlHash = raw.url ? calculateUrlHash(raw.url) : null
    const now = Date.now()

    if (db) {
      try {
        // Upsert canonical record
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

        // Upsert resource record
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
          0.9,
          JSON.stringify(raw.metadata || {}),
          now,
          now
        ).run()

        inserted++
      } catch {
        // Continue loop
      }
    } else {
      inserted++
    }
  }

  return {
    success: true,
    received: items.length,
    processed: inserted
  }
})
