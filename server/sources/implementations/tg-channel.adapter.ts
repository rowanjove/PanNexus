import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'

/** Legacy id kept for admin/seed compatibility. Real TG crawl lives in TelegramGenericAdapter. */
export class TgChannelAdapter extends BaseSourceAdapter {
  readonly id = 'tg_channel'
  readonly name = 'Telegram 资源频道（请使用 tg_* 通用适配器）'
  readonly type = 'telegram' as const
  override readonly priority = 70
  override readonly capabilities = {
    crawl: false,
    search: false,
    healthCheck: true
  }

  protected async search(_query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    return []
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return { items: [] }
  }
}
