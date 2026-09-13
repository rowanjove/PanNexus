import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { fetchRssResources } from '../../core/rss/parse'

export class DmhyAdapter extends BaseSourceAdapter {
  readonly id = 'dmhy_anime'
  readonly name = '动漫花园公开 RSS'
  readonly type = 'rss' as const
  override readonly priority = 82
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []
    const url = `https://share.dmhy.org/topics/rss/rss.xml?keyword=${encodeURIComponent(q)}`
    return fetchRssResources(url, signal, { source: 'dmhy' })
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const items = await fetchRssResources('https://share.dmhy.org/topics/rss/rss.xml', undefined, { source: 'dmhy' })
    return { items }
  }
}
