import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'

export class AlistAdapter extends BaseSourceAdapter {
  readonly id = 'alist_hub'
  readonly name = 'AList 开放分布式网盘源'
  readonly type = 'api' as const
  override readonly priority = 88
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
        title: `${q} 典藏合集 4K 60FPS 杜比视界 AList挂载盘`,
        url: `https://pan.example-alist.org/d/public/${encodeURIComponent(q)}_4k_collection`,
        resourceType: 'cloud_drive',
        provider: '123pan',
        size: 52 * 1024 * 1024 * 1024,
        fileCount: 12,
        publishedAt: Date.now() - 3600 * 1000 * 5,
        files: [
          { filename: `${q}.EP01.4k.dv.mkv`, sizeBytes: 4200 * 1024 * 1024, extension: 'mkv' },
          { filename: `${q}.EP02.4k.dv.mkv`, sizeBytes: 4300 * 1024 * 1024, extension: 'mkv' }
        ],
        metadata: { resolution: '2160p', source: 'AList-V3-Index' }
      },
      {
        title: `${q} 原声音乐与配套资料 官方无损版`,
        url: `https://pan.example-alist.org/d/media/${encodeURIComponent(q)}_ost_data`,
        resourceType: 'cloud_drive',
        provider: 'aliyun',
        size: 1500 * 1024 * 1024,
        fileCount: 8,
        publishedAt: Date.now() - 3600 * 1000 * 24,
        metadata: { format: 'FLAC' }
      }
    ]
  }

  protected async crawl(cursor?: string): Promise<CrawlResult> {
    const page = cursor ? parseInt(cursor.replace('alist_p', ''), 10) : 1
    if (page === 1) {
      return {
        items: [
          {
            title: '肖申克的救赎 The Shawshank Redemption 1994 2160p REMUX AList',
            url: 'https://pan.example-alist.org/d/movies/shawshank_4k_remux',
            resourceType: 'cloud_drive',
            provider: '123pan',
            size: 68 * 1024 * 1024 * 1024,
            publishedAt: Date.now() - 3600 * 1000 * 48,
            metadata: { resolution: '2160p', year: 1994, codec: 'HEVC' }
          }
        ],
        nextCursor: undefined
      }
    }
    return { items: [], nextCursor: undefined }
  }
}
