import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { extractPanResourcesFromText } from '../../core/dedup/pan-extractor'
import { safeFetch } from '../../core/http/safe-fetch'

export class AliyunHubAdapter extends BaseSourceAdapter {
  readonly id = 'aliyun_hub'
  readonly name = '阿里云盘专线索引'
  readonly type = 'html' as const
  override readonly priority = 84
  override readonly capabilities = {
    crawl: false,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    try {
      const targetUrl = `https://alipansou.com/search?k=${encodeURIComponent(q)}`
      const res = await safeFetch(targetUrl, {
        signal,
        timeoutMs: 6000,
        headers: {
          Referer: 'https://alipansou.com/',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })

      if (!res.ok) return []

      const html = await res.text().catch(() => '')
      if (!html) return []

      const extracted = extractPanResourcesFromText(html)
      const aliyunOnly = extracted.filter(r => r.provider === 'aliyun')

      return (aliyunOnly.length > 0 ? aliyunOnly : extracted).map(item => ({
        title: item.title,
        url: item.url,
        provider: 'aliyun',
        resourceType: item.resourceType || 'general',
        password: item.password,
        publishedAt: Date.now(),
        metadata: { source: 'aliyun_hub' }
      }))
    } catch {
      return []
    }
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return { items: [] }
  }
}
