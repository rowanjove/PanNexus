import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { extractPanResourcesFromText } from '../../core/dedup/pan-extractor'
import { safeFetch } from '../../core/http/safe-fetch'

export interface PanSearchItem {
  title?: string
  url?: string
  content?: string
  pan_type?: string
  time?: string
}

export class PanSearchAdapter extends BaseSourceAdapter {
  readonly id = 'pansearch_aggregate'
  readonly name = 'PanSearch 开放网盘聚合'
  readonly type = 'api' as const
  override readonly priority = 88
  override readonly capabilities = {
    crawl: false,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    try {
      let panParam = ''
      if (query.provider === 'quark') panParam = '&pan=quark'
      else if (query.provider === 'aliyun') panParam = '&pan=aliyundrive'
      else if (query.provider === 'baidu') panParam = '&pan=baidu'
      else if (query.provider === 'xunlei') panParam = '&pan=xunlei'

      const targetUrl = `https://pansearch.me/api/search?keyword=${encodeURIComponent(q)}${panParam}`
      const res = await safeFetch(targetUrl, {
        signal,
        timeoutMs: 7000,
        headers: {
          Referer: 'https://pansearch.me/',
          Accept: 'application/json'
        }
      })

      if (!res.ok) return []

      const json = await res.json() as { data?: { list?: PanSearchItem[] } | PanSearchItem[] }
      const items = Array.isArray(json?.data)
        ? json.data
        : (json?.data && Array.isArray(json.data.list) ? json.data.list : [])

      const resources: RawResource[] = []

      for (const item of items) {
        const rawContent = item.content || ''
        const cleanContent = rawContent
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')

        let candidateTitle = item.title
        if (!candidateTitle && cleanContent) {
          const nameMatch = /(?:名称|标题)[：:]\s*([^\n\r]+)/i.exec(cleanContent)
          if (nameMatch) {
            candidateTitle = nameMatch[1].trim()
          }
        }

        const textBlock = `${candidateTitle || ''}\n${cleanContent}\n${item.url || ''}`
        const extracted = extractPanResourcesFromText(textBlock, candidateTitle)

        for (const resItem of extracted) {
          resources.push({
            title: resItem.title,
            url: resItem.url,
            provider: resItem.provider as any,
            resourceType: resItem.resourceType,
            password: resItem.password,
            publishedAt: item.time ? Date.parse(item.time) || Date.now() : Date.now(),
            metadata: {
              source: 'pansearch',
              originalTitle: candidateTitle || item.title
            }
          })
        }
      }

      return resources
    } catch {
      return []
    }
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return { items: [] }
  }
}
