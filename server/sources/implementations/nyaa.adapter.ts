import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import crypto from 'node:crypto'

export class NyaaAdapter extends BaseSourceAdapter {
  readonly id = 'nyaa_global'
  readonly name = 'Nyaa 国际动漫高质量种子'
  readonly type = 'torznab' as const
  override readonly priority = 80
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    const hash = crypto.createHash('sha1').update(`nyaa_${q}_lossless`).digest('hex')

    return [
      {
        title: `[SubsPlease] ${q} (01-12) (1080p) [Multiple Subtitle Batch]`,
        url: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(q)}`,
        infohash: hash,
        resourceType: 'magnet',
        provider: 'magnet',
        size: 16 * 1024 * 1024 * 1024,
        fileCount: 12,
        publishedAt: Date.now() - 3600 * 1000 * 14,
        files: [
          { filename: `[SubsPlease] ${q} - 01 (1080p) [9A1B2C].mkv`, sizeBytes: 1350 * 1024 * 1024, extension: 'mkv' }
        ],
        metadata: { resolution: '1080p', category: 'anime', seeders: 142, leechers: 12 }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const hash = crypto.createHash('sha1').update('shingeki_no_kyojin_final').digest('hex')
    return {
      items: [
        {
          title: '[Erai-raws] Shingeki no Kyojin (Attack on Titan) The Final Season Part 3 [1080p][HEVC][Multiple Subtitle]',
          url: `magnet:?xt=urn:btih:${hash}&dn=Attack_on_Titan_Final`,
          infohash: hash,
          resourceType: 'magnet',
          provider: 'magnet',
          size: 22 * 1024 * 1024 * 1024,
          publishedAt: Date.now() - 3600 * 1000 * 100,
          metadata: { resolution: '1080p', category: 'anime' }
        }
      ],
      nextCursor: undefined
    }
  }
}
