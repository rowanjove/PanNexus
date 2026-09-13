import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { extractPanResourcesFromText } from '../../core/dedup/pan-extractor'
import { safeFetch } from '../../core/http/safe-fetch'

export class QuarkShareAdapter extends BaseSourceAdapter {
  readonly id = 'quark_share'
  readonly name = 'Quark4K 夸克影视专区'
  readonly type = 'api' as const
  override readonly priority = 86
  override readonly capabilities = {
    crawl: false,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    try {
      const targetUrl = `https://quark4k.com/api/search?keyword=${encodeURIComponent(q)}`
      const res = await safeFetch(targetUrl, {
        signal,
        timeoutMs: 6000,
        headers: {
          Referer: 'https://quark4k.com/',
          Accept: 'application/json, text/plain, */*'
        }
      })

      if (!res.ok) return []

      const rawText = await res.text().catch(() => '')
      if (!rawText) return []

      // 1. Try parsing JSON format
      try {
        const json = JSON.parse(rawText)
        const list = Array.isArray(json?.data?.list) ? json.data.list : (Array.isArray(json?.data) ? json.data : [])
        if (list.length > 0) {
          const resources: RawResource[] = []
          for (const item of list) {
            const title = item.title || item.name || ''
            const textContent = `${title}\n${item.url || item.share_url || ''}\n${item.description || ''}`
            const extracted = extractPanResourcesFromText(textContent, title)
            for (const r of extracted) {
              if (r.provider === 'quark' || !r.provider || r.provider === 'unknown') {
                resources.push({
                  title: r.title || title,
                  url: r.url,
                  provider: 'quark',
                  resourceType: 'movie',
                  password: r.password,
                  publishedAt: item.created_at ? Date.parse(item.created_at) || Date.now() : Date.now(),
                  metadata: {
                    source: 'quark4k',
                    resolution: '4k',
                    originalTitle: title
                  }
                })
              }
            }
          }
          if (resources.length > 0) return resources
        }
      } catch {
        // Fallback to text extraction
      }

      // 2. Parse HTML / Text
      const extracted = extractPanResourcesFromText(rawText)
      return extracted.map(item => ({
        title: item.title,
        url: item.url,
        provider: 'quark',
        resourceType: 'movie',
        password: item.password,
        publishedAt: Date.now(),
        metadata: { source: 'quark4k', resolution: '4k' }
      }))
    } catch {
      return []
    }
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return { items: [] }
  }
}
