import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'

export class TgChannelAdapter extends BaseSourceAdapter {
  readonly id = 'tg_channel'
  readonly name = 'Telegram 资源频道推送'
  readonly type = 'telegram' as const
  override readonly priority = 70
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    const keyword = query.q.toLowerCase()
    return [
      {
        title: `[TG精选] ${query.q} 115网盘 原盘收藏`,
        url: `https://115.com/s/tg_${encodeURIComponent(keyword)}`,
        password: 'tgvip',
        resourceType: 'cloud_drive',
        provider: '115',
        size: 45 * 1024 * 1024 * 1024,
        publishedAt: Date.now() - 3600 * 1000 * 8,
        metadata: { channel: '@ResourceHub', resolution: '2160p' }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return {
      items: [],
      nextCursor: undefined
    }
  }
}
