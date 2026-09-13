import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { safeFetch } from '../../core/http/safe-fetch'

export class MagnetIndexAdapter extends BaseSourceAdapter {
  readonly id = 'magnet_index'
  readonly name = '开放磁力与 DHT 聚合网关'
  readonly type = 'torznab' as const
  override readonly priority = 90
  override readonly capabilities = {
    crawl: false,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    try {
      const targetUrl = `https://solidtorrents.to/api/v1/search?q=${encodeURIComponent(q)}&category=all`
      const res = await safeFetch(targetUrl, {
        signal,
        timeoutMs: 7000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MetaSeek-Magnet-Client/1.0'
        }
      })

      if (!res.ok) return []

      const json = await res.json() as any
      const results = Array.isArray(json?.results) ? json.results : []
      const resources: RawResource[] = []

      for (const item of results) {
        const title = item.title || ''
        const infohash = (item.infohash || '').toLowerCase()
        const magnet = item.magnet || (infohash ? `magnet:?xt=urn:btih:${infohash}&dn=${encodeURIComponent(title)}` : '')
        if (!title || (!infohash && !magnet)) continue

        resources.push({
          title,
          url: magnet,
          infohash: infohash || undefined,
          provider: 'magnet',
          resourceType: 'magnet',
          size: Number(item.size) || undefined,
          publishedAt: item.imported ? Date.parse(item.imported) || Date.now() : Date.now(),
          metadata: {
            source: 'magnet_index',
            seeders: item.swarm?.seeders,
            leechers: item.swarm?.leechers
          }
        })
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
