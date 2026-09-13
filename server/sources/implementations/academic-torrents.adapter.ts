import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { fetchRssResources } from '../../core/rss/parse'

export class AcademicTorrentsAdapter extends BaseSourceAdapter {
  readonly id = 'academic_torrents'
  readonly name = 'Academic Torrents 学术与科研数据'
  readonly type = 'rss' as const
  override readonly priority = 89
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []
    const url = `https://academictorrents.com/browse.php?search=${encodeURIComponent(q)}&format=rss`
    return fetchRssResources(url, signal, { source: 'academic_torrents' })
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const items = await fetchRssResources('https://academictorrents.com/browse.php?format=rss', undefined, { source: 'academic_torrents' })
    return { items }
  }
}
