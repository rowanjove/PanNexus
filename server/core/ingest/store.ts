import type { ResourceFile } from '~/shared/types'
import type { D1DatabaseLike } from '../../utils/db'
import type { BlockedItem } from './blocked'

export interface CanonicalRow {
  id: string
  title: string
  originalTitle?: string | null
  category?: string | null
  year?: number | null
  resolution?: string | null
  codec?: string | null
  audio?: string | null
  edition?: string | null
  normalizedKey: string
  metadata?: string | null
}

export interface ResourceRow {
  canonicalId: string
  title: string
  normalizedTitle: string
  resourceType: string
  provider: string
  url?: string | null
  urlHash?: string | null
  infohash?: string | null
  password?: string | null
  sizeBytes?: number | null
  fileCount: number
  sourceId?: number | null
  publishedAt?: number | null
  qualityScore: number
  metadata: string
}

export interface IngestStore {
  listBlocked(): Promise<BlockedItem[]>
  getSourceId(sourceKey: string): Promise<number | null>
  upsertCanonical(row: CanonicalRow): Promise<void>
  findResourceId(urlHash?: string | null, infohash?: string | null): Promise<number | null>
  insertResource(row: ResourceRow): Promise<number>
  updateResource(id: number, row: ResourceRow): Promise<void>
  replaceFiles(resourceId: number, files: ResourceFile[]): Promise<void>
  touchSource(sourceKey: string, success: boolean, latencyMs: number, circuitState: string): Promise<void>
  recordFailedJob(sourceKey: string, error: string, payload: string): Promise<void>
}

export class MemoryIngestStore implements IngestStore {
  blocked: BlockedItem[] = []
  sources = new Map<string, { id: number; success: number; failure: number }>()
  canonicals = new Map<string, CanonicalRow>()
  resources: Array<ResourceRow & { id: number; lastSeenAt: number }> = []
  files = new Map<number, ResourceFile[]>()
  failedJobs: Array<{ sourceKey: string; error: string; payload: string }> = []
  private nextId = 1
  private nextSourceId = 1

  constructor(sourceKeys: string[] = []) {
    for (const key of sourceKeys) {
      this.sources.set(key, { id: this.nextSourceId++, success: 0, failure: 0 })
    }
  }

  async listBlocked() {
    return this.blocked
  }

  async getSourceId(sourceKey: string) {
    const existing = this.sources.get(sourceKey)
    if (existing) return existing.id
    const id = this.nextSourceId++
    this.sources.set(sourceKey, { id, success: 0, failure: 0 })
    return id
  }

  async upsertCanonical(row: CanonicalRow) {
    this.canonicals.set(row.id, row)
  }

  async findResourceId(urlHash?: string | null, infohash?: string | null) {
    if (urlHash) {
      const hit = this.resources.find(r => r.urlHash === urlHash)
      if (hit) return hit.id
    }
    if (infohash) {
      const hit = this.resources.find(r => r.infohash === infohash)
      if (hit) return hit.id
    }
    return null
  }

  async insertResource(row: ResourceRow) {
    const id = this.nextId++
    this.resources.push({ ...row, id, lastSeenAt: Date.now() })
    return id
  }

  async updateResource(id: number, row: ResourceRow) {
    const idx = this.resources.findIndex(r => r.id === id)
    if (idx >= 0) {
      this.resources[idx] = { ...this.resources[idx], ...row, lastSeenAt: Date.now() }
    }
  }

  async replaceFiles(resourceId: number, files: ResourceFile[]) {
    this.files.set(resourceId, files)
  }

  async touchSource(sourceKey: string, success: boolean) {
    const src = this.sources.get(sourceKey)
    if (!src) return
    if (success) src.success += 1
    else src.failure += 1
  }

  async recordFailedJob(sourceKey: string, error: string, payload: string) {
    this.failedJobs.push({ sourceKey, error, payload })
  }
}

export function createD1IngestStore(db: D1DatabaseLike): IngestStore {
  return {
    async listBlocked() {
      try {
        const { results } = await db.prepare('SELECT type, value FROM blocked_items').all<BlockedItem>()
        return results || []
      } catch {
        return []
      }
    },

    async getSourceId(sourceKey: string) {
      try {
        const row = await db.prepare('SELECT id FROM sources WHERE source_key = ?').bind(sourceKey).first<{ id: number }>()
        return row?.id ?? null
      } catch {
        return null
      }
    },

    async upsertCanonical(row: CanonicalRow) {
      const now = Date.now()
      await db.prepare(`
        INSERT INTO canonical_resources (
          id, title, original_title, category, year, resolution, codec, audio, edition, normalized_key, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          updated_at = excluded.updated_at,
          title = excluded.title
      `).bind(
        row.id,
        row.title,
        row.originalTitle || null,
        row.category || null,
        row.year || null,
        row.resolution || null,
        row.codec || null,
        row.audio || null,
        row.edition || null,
        row.normalizedKey,
        row.metadata || null,
        now,
        now
      ).run()
    },

    async findResourceId(urlHash?: string | null, infohash?: string | null) {
      if (urlHash) {
        const row = await db.prepare('SELECT id FROM resources WHERE url_hash = ? LIMIT 1').bind(urlHash).first<{ id: number }>()
        if (row?.id) return row.id
      }
      if (infohash) {
        const row = await db.prepare('SELECT id FROM resources WHERE infohash = ? LIMIT 1').bind(infohash).first<{ id: number }>()
        if (row?.id) return row.id
      }
      return null
    },

    async insertResource(row: ResourceRow) {
      const now = Date.now()
      const result = await db.prepare(`
        INSERT INTO resources (
          canonical_id, title, normalized_title, resource_type, provider, url, url_hash, infohash,
          password, size_bytes, file_count, source_id, published_at, discovered_at, last_seen_at,
          status, quality_score, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      `).bind(
        row.canonicalId,
        row.title,
        row.normalizedTitle,
        row.resourceType,
        row.provider,
        row.url || null,
        row.urlHash || null,
        row.infohash || null,
        row.password || null,
        row.sizeBytes || null,
        row.fileCount,
        row.sourceId || null,
        row.publishedAt || null,
        now,
        now,
        row.qualityScore,
        row.metadata,
        now,
        now
      ).run()

      const insertedId = result.meta?.last_row_id
      if (insertedId) return Number(insertedId)

      const found = await this.findResourceId(row.urlHash, row.infohash)
      return found || 0
    },

    async updateResource(id: number, row: ResourceRow) {
      const now = Date.now()
      await db.prepare(`
        UPDATE resources SET
          canonical_id = ?,
          title = ?,
          normalized_title = ?,
          resource_type = ?,
          provider = ?,
          url = ?,
          url_hash = ?,
          infohash = ?,
          password = ?,
          size_bytes = ?,
          file_count = ?,
          last_seen_at = ?,
          status = 'active',
          quality_score = ?,
          metadata = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        row.canonicalId,
        row.title,
        row.normalizedTitle,
        row.resourceType,
        row.provider,
        row.url || null,
        row.urlHash || null,
        row.infohash || null,
        row.password || null,
        row.sizeBytes || null,
        row.fileCount,
        now,
        row.qualityScore,
        row.metadata,
        now,
        id
      ).run()
    },

    async replaceFiles(resourceId: number, files: ResourceFile[]) {
      await db.prepare('DELETE FROM resource_files WHERE resource_id = ?').bind(resourceId).run()
      for (const file of files.slice(0, 20)) {
        await db.prepare(`
          INSERT INTO resource_files (resource_id, path, filename, extension, size_bytes)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          resourceId,
          file.path || null,
          file.filename,
          file.extension || null,
          file.sizeBytes || null
        ).run()
      }
    },

    async touchSource(sourceKey: string, success: boolean, latencyMs: number, circuitState: string) {
      const now = Date.now()
      if (success) {
        await db.prepare(`
          UPDATE sources SET
            last_crawl_at = ?,
            last_success_at = ?,
            success_count = success_count + 1,
            avg_latency = CASE WHEN avg_latency = 0 THEN ? ELSE CAST((avg_latency * 0.7 + ?) AS INTEGER) END,
            health_score = MIN(1.0, health_score + 0.02),
            circuit_state = ?
          WHERE source_key = ?
        `).bind(now, now, latencyMs, latencyMs, circuitState, sourceKey).run()
      } else {
        await db.prepare(`
          UPDATE sources SET
            last_failure_at = ?,
            failure_count = failure_count + 1,
            health_score = MAX(0.0, health_score - 0.08),
            circuit_state = ?
          WHERE source_key = ?
        `).bind(now, circuitState, sourceKey).run()
      }
    },

    async recordFailedJob(sourceKey: string, error: string, payload: string) {
      await db.prepare(`
        INSERT INTO failed_jobs (source_key, error, payload, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(sourceKey, error.slice(0, 500), payload.slice(0, 2000), Date.now()).run()
    }
  }
}
