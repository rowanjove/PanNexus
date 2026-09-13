import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { fetchRssResources } from '../../core/rss/parse'

export class NyaaAdapter extends BaseSourceAdapter {
  readonly id = 'nyaa_global'
  readonly name = 'Nyaa 公开 RSS'
  readonly type = 'rss' as const
  override readonly priority = 80
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []
    const url = `https://nyaa.si/?page=rss&q=${encodeURIComponent(q)}&c=0_0&f=0`
    return fetchRssResources(url, signal, { source: 'nyaa' })
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const items = await fetchRssResources('https://nyaa.si/?page=rss', undefined, { source: 'nyaa' })
    return { items }
  }
}
