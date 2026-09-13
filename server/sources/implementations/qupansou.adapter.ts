import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { extractPanResourcesFromText } from '../../core/dedup/pan-extractor'
import { safeFetch } from '../../core/http/safe-fetch'

export class QuPanSouAdapter extends BaseSourceAdapter {
  readonly id = 'qupansou_aggregate'
  readonly name = '趣盘搜全网盘聚合'
  readonly type = 'api' as const
  override readonly priority = 87
  override readonly capabilities = {
    crawl: false,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    try {
      const targetUrl = `https://qupansou.com/api/search?keyword=${encodeURIComponent(q)}`
      const res = await safeFetch(targetUrl, {
        signal,
        timeoutMs: 7000,
        headers: {
          Referer: 'https://qupansou.com/',
          Accept: 'application/json, text/plain, */*'
        }
      })

      if (!res.ok) return []

      const rawText = await res.text().catch(() => '')
      if (!rawText) return []

      // 1. Try parsing JSON if available
      try {
        const json = JSON.parse(rawText)
        const items = Array.isArray(json?.data?.list) ? json.data.list : (Array.isArray(json?.data) ? json.data : [])
        if (items.length > 0) {
          const resources: RawResource[] = []
          for (const item of items) {
            const title = item.title || item.name || ''
            const content = `${title}\n${item.description || item.content || ''}\n${item.url || item.link || ''}`
            const extracted = extractPanResourcesFromText(content, title)
            for (const r of extracted) {
              resources.push({
                title: r.title,
                url: r.url,
                provider: r.provider as any,
                resourceType: r.resourceType,
                password: r.password,
                publishedAt: item.created_at ? Date.parse(item.created_at) || Date.now() : Date.now(),
                metadata: {
                  source: 'qupansou',
                  originalTitle: title
                }
              })
            }
          }
          if (resources.length > 0) return resources
        }
      } catch {
        // Fallback to text / HTML parsing
      }

      // 2. Parse HTML / Plain Text
      const extracted = extractPanResourcesFromText(rawText)
      return extracted.map(item => ({
        title: item.title,
        url: item.url,
        provider: item.provider as any,
        resourceType: item.resourceType,
        password: item.password,
        publishedAt: Date.now(),
        metadata: { source: 'qupansou' }
      }))
    } catch {
      return []
    }
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return { items: [] }
  }
}
