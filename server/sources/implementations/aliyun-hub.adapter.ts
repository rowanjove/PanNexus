import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'

export class AliyunHubAdapter extends BaseSourceAdapter {
  readonly id = 'aliyun_hub'
  readonly name = '阿里云盘原画社群索引'
  readonly type = 'html' as const
  override readonly priority = 84
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
        title: `${q} 2160p 原盘 REMUX TrueHD 7.1 Atmos 阿里原画`,
        url: `https://www.alipan.com/s/ali_${encodeURIComponent(q.toLowerCase())}_remux`,
        resourceType: 'cloud_drive',
        provider: 'aliyun',
        size: 45 * 1024 * 1024 * 1024,
        fileCount: 4,
        publishedAt: Date.now() - 3600 * 1000 * 8,
        files: [
          { filename: `${q}.2024.2160p.remux.mkv`, sizeBytes: 44 * 1024 * 1024 * 1024, extension: 'mkv' },
          { filename: `${q}.ass`, sizeBytes: 120 * 1024, extension: 'ass' }
        ],
        metadata: { resolution: '2160p', codec: 'HEVC', audio: 'TrueHD 7.1 Atmos', edition: 'REMUX' }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return {
      items: [
        {
          title: '权力的游戏 Game of Thrones S01-S08 4K HDR 杜比视界 阿里云盘',
          url: 'https://www.alipan.com/s/ali_got_complete_4k',
          resourceType: 'cloud_drive',
          provider: 'aliyun',
          size: 280 * 1024 * 1024 * 1024,
          publishedAt: Date.now() - 3600 * 1000 * 96,
          metadata: { resolution: '2160p', season: 8 }
        }
      ],
      nextCursor: undefined
    }
  }
}
