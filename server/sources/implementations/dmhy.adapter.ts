import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import crypto from 'node:crypto'

export class DmhyAdapter extends BaseSourceAdapter {
  readonly id = 'dmhy_anime'
  readonly name = '动漫花园 ACGN 连载分发'
  readonly type = 'rss' as const
  override readonly priority = 82
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    const hash = crypto.createHash('sha1').update(`dmhy_${q}`).digest('hex')

    return [
      {
        title: `[动漫国字幕组&波罗包字幕组] ${q} [01-12话全] [1080P HEVC-10bit AAC] [简繁内嵌]`,
        url: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(q)}`,
        infohash: hash,
        resourceType: 'magnet',
        provider: 'magnet',
        size: 14 * 1024 * 1024 * 1024,
        fileCount: 12,
        publishedAt: Date.now() - 3600 * 1000 * 6,
        files: [
          { filename: `[DMG]_${q}_01.mp4`, sizeBytes: 1100 * 1024 * 1024, extension: 'mp4' },
          { filename: `[DMG]_${q}_02.mp4`, sizeBytes: 1150 * 1024 * 1024, extension: 'mp4' }
        ],
        metadata: { resolution: '1080p', codec: 'HEVC', category: 'anime' }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const hash = crypto.createHash('sha1').update('spy_family_s2').digest('hex')
    return {
      items: [
        {
          title: '[喵萌奶茶屋] 间谍过家家 SPY×FAMILY S02 [13-25] [BDRip 1080p HEVC-10bit FLAC] 简繁日多语',
          url: `magnet:?xt=urn:btih:${hash}&dn=SPY_FAMILY_S02`,
          infohash: hash,
          resourceType: 'magnet',
          provider: 'magnet',
          size: 18 * 1024 * 1024 * 1024,
          fileCount: 13,
          publishedAt: Date.now() - 3600 * 1000 * 50,
          metadata: { resolution: '1080p', category: 'anime' }
        }
      ],
      nextCursor: undefined
    }
  }
}
