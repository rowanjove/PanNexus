import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'

export interface TorznabItem {
  title: string
  link?: string
  enclosureUrl?: string
  sizeBytes?: number
  pubDate?: string
  infohash?: string
  seeders?: number
  peers?: number
}

/**
 * Lightweight, zero-dependency Torznab XML / RSS Item Parser.
 */
export function parseTorznabXml(xml: string): TorznabItem[] {
  const items: TorznabItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemBlock = match[1]

    const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(itemBlock)
    const title = titleMatch ? titleMatch[1].trim() : ''
    if (!title) continue

    const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(itemBlock)
    const link = linkMatch ? linkMatch[1].trim() : undefined

    const enclosureMatch = /<enclosure\s+([^>]*)\/?>/i.exec(itemBlock)
    let enclosureUrl: string | undefined
    let sizeBytes: number | undefined
    if (enclosureMatch) {
      const urlAttr = /url=["']([^"']+)["']/i.exec(enclosureMatch[1])
      const lengthAttr = /length=["']([^"']+)["']/i.exec(enclosureMatch[1])
      if (urlAttr) enclosureUrl = urlAttr[1]
      if (lengthAttr) sizeBytes = parseInt(lengthAttr[1], 10)
    }

    const sizeMatch = /<size>(\d+)<\/size>/i.exec(itemBlock)
    if (!sizeBytes && sizeMatch) {
      sizeBytes = parseInt(sizeMatch[1], 10)
    }

    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemBlock)
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : undefined

    // Torznab attributes: <torznab:attr name="..." value="..." />
    let infohash: string | undefined
    let seeders: number | undefined
    let peers: number | undefined

    const attrRegex = /<torznab:attr\s+name=["']([^"']+)["']\s+value=["']([^"']+)["']\s*\/?>/gi
    let attrMatch: RegExpExecArray | null
    while ((attrMatch = attrRegex.exec(itemBlock)) !== null) {
      const name = attrMatch[1].toLowerCase()
      const value = attrMatch[2]
      if (name === 'infohash') infohash = value.toLowerCase()
      else if (name === 'seeders') seeders = parseInt(value, 10)
      else if (name === 'peers') peers = parseInt(value, 10)
    }

    // Try extracting infohash from magnet url if absent
    if (!infohash && link && link.includes('urn:btih:')) {
      const m = /urn:btih:([a-f0-9]{40}|[a-z2-7]{32})/i.exec(link)
      if (m) infohash = m[1].toLowerCase()
    }

    items.push({
      title,
      link,
      enclosureUrl,
      sizeBytes,
      pubDate,
      infohash,
      seeders,
      peers
    })
  }

  return items
}

export class TorznabAdapter extends BaseSourceAdapter {
  readonly id = 'torznab_gateway'
  readonly name = 'Torznab / Jackett 协议网关'
  readonly type = 'torznab' as const
  override readonly priority = 92
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  private apiUrl?: string
  private apiKey?: string

  constructor(apiUrl?: string, apiKey?: string) {
    super()
    this.apiUrl = apiUrl
    this.apiKey = apiKey
  }

  private resolveConfig() {
    return {
      apiUrl: this.apiUrl || (typeof process !== 'undefined' ? process.env.TORZNAB_URL : undefined),
      apiKey: this.apiKey || (typeof process !== 'undefined' ? process.env.TORZNAB_API_KEY : undefined)
    }
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    const { apiUrl, apiKey } = this.resolveConfig()
    if (!apiUrl || !apiKey) return []

    const { safeFetch } = await import('../../core/http/safe-fetch')
    const url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}t=search&q=${encodeURIComponent(q)}&apikey=${encodeURIComponent(apiKey)}`
    const res = await safeFetch(url, { signal, timeoutMs: 8000 })
    if (!res.ok) return []
    const xml = await res.text()
    const parsedItems = parseTorznabXml(xml)

    return parsedItems
      .map(item => {
        const magnet = item.link?.startsWith('magnet:?') ? item.link : (item.infohash ? `magnet:?xt=urn:btih:${item.infohash}` : item.enclosureUrl)
        if (!item.title || !magnet) return null
        return {
          title: item.title,
          url: magnet,
          infohash: item.infohash,
          resourceType: 'magnet' as const,
          provider: 'magnet' as const,
          size: item.sizeBytes,
          publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
          metadata: {
            seeders: item.seeders,
            peers: item.peers,
            gateway: 'Torznab'
          }
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const { apiUrl, apiKey } = this.resolveConfig()
    if (!apiUrl || !apiKey) return { items: [] }

    const { safeFetch } = await import('../../core/http/safe-fetch')
    const url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}t=search&q=&apikey=${encodeURIComponent(apiKey)}`
    const res = await safeFetch(url, { timeoutMs: 8000 })
    if (!res.ok) return { items: [] }
    const xml = await res.text()
    const items = parseTorznabXml(xml)
      .map(item => {
        const magnet = item.link?.startsWith('magnet:?') ? item.link : (item.infohash ? `magnet:?xt=urn:btih:${item.infohash}` : item.enclosureUrl)
        if (!item.title || !magnet) return null
        return {
          title: item.title,
          url: magnet,
          infohash: item.infohash,
          resourceType: 'magnet' as const,
          provider: 'magnet' as const,
          size: item.sizeBytes,
          publishedAt: item.pubDate ? Date.parse(item.pubDate) || Date.now() : Date.now(),
          metadata: { seeders: item.seeders, peers: item.peers, gateway: 'Torznab' }
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return { items }
  }
}
