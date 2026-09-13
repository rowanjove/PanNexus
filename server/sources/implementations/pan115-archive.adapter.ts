import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { extractPanResourcesFromText } from '../../core/dedup/pan-extractor'
import { safeFetch } from '../../core/http/safe-fetch'

export class Pan115ArchiveAdapter extends BaseSourceAdapter {
  readonly id = '115_vip_archive'
  readonly name = '115 蓝光与原盘专区'
  readonly type = 'api' as const
  override readonly priority = 85
  override readonly capabilities = {
    crawl: false,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    try {
      const targetUrl = `https://115pan.com/api/search?q=${encodeURIComponent(q)}`
      const res = await safeFetch(targetUrl, {
        signal,
        timeoutMs: 6000,
        headers: {
          Referer: 'https://115pan.com/',
          Accept: 'application/json, text/plain, text/html, */*'
        }
      })

      if (!res.ok) return []

      const text = await res.text().catch(() => '')
      if (!text) return []

      const extracted = extractPanResourcesFromText(text)
      const pan115Only = extracted.filter(r => r.provider === '115')

      return (pan115Only.length > 0 ? pan115Only : extracted).map(item => ({
        title: item.title,
        url: item.url,
        provider: '115',
        resourceType: item.resourceType || 'movie',
        password: item.password,
        publishedAt: Date.now(),
        metadata: { source: '115_archive' }
      }))
    } catch {
      return []
    }
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return { items: [] }
  }
}
