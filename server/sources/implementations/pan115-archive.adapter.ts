import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'

export class Pan115ArchiveAdapter extends BaseSourceAdapter {
  readonly id = '115_vip_archive'
  readonly name = '115 蓝光与特种离线库'
  readonly type = 'api' as const
  override readonly priority = 85
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    return [
      {
        title: `${q} BDMV 原盘 ISO 典藏压制 115秒传提取码`,
        url: `https://115.com/s/115_${encodeURIComponent(q.toLowerCase())}_bdmv`,
        password: 'vip8',
        resourceType: 'cloud_drive',
        provider: '115',
        size: 62 * 1024 * 1024 * 1024,
        fileCount: 1,
        publishedAt: Date.now() - 3600 * 1000 * 12,
        files: [
          { filename: `${q}.2024.BDMV.iso`, sizeBytes: 62 * 1024 * 1024 * 1024, extension: 'iso' }
        ],
        metadata: { resolution: '2160p', edition: 'BDMV' }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return {
      items: [
        {
          title: '指环王三部曲导剪版 The Lord of the Rings 4K REMUX 115网盘',
          url: 'https://115.com/s/115_lotr_extended_4k',
          password: 'ring',
          resourceType: 'cloud_drive',
          provider: '115',
          size: 210 * 1024 * 1024 * 1024,
          publishedAt: Date.now() - 3600 * 1000 * 120,
          metadata: { resolution: '2160p', edition: 'Extended' }
        }
      ],
      nextCursor: undefined
    }
  }
}
