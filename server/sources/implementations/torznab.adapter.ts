import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import crypto from 'node:crypto'

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

  protected async search(query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    // If real Torznab API URL is configured, fetch upstream
    if (this.apiUrl && this.apiKey) {
      try {
        const url = `${this.apiUrl}?t=search&q=${encodeURIComponent(q)}&apikey=${this.apiKey}`
        const res = await fetch(url, { signal: _signal })
        if (!res.ok) return []
        const xml = await res.text()
        const parsedItems = parseTorznabXml(xml)

        return parsedItems.map(item => ({
          title: item.title,
          url: item.link || item.enclosureUrl || (item.infohash ? `magnet:?xt=urn:btih:${item.infohash}` : ''),
          infohash: item.infohash,
          resourceType: 'magnet',
          provider: 'magnet',
          size: item.sizeBytes,
          publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
          metadata: {
            seeders: item.seeders,
            peers: item.peers,
            gateway: 'Torznab'
          }
        }))
      } catch {
        return []
      }
    }

    // Default simulation for standalone / offline operation
    const mockHash = crypto.createHash('sha1').update(`torznab_${q}`).digest('hex')
    return [
      {
        title: `${q}.2024.2160p.HDR.DTS-HD.MA.5.1 [Torznab Indexer]`,
        url: `magnet:?xt=urn:btih:${mockHash}&dn=${encodeURIComponent(q)}`,
        infohash: mockHash,
        resourceType: 'magnet',
        provider: 'magnet',
        size: 32 * 1024 * 1024 * 1024,
        publishedAt: Date.now() - 3600 * 1000 * 10,
        metadata: {
          seeders: 85,
          peers: 12,
          resolution: '2160p',
          gateway: 'Torznab/Jackett'
        }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const hash = crypto.createHash('sha1').update('torznab_academic_feed').digest('hex')
    return {
      items: [
        {
          title: 'DeepSeek-R1-Distill-Qwen-32B GGUF Model Weights Dataset',
          url: `magnet:?xt=urn:btih:${hash}&dn=DeepSeek-R1-32B`,
          infohash: hash,
          resourceType: 'magnet',
          provider: 'magnet',
          size: 21 * 1024 * 1024 * 1024,
          publishedAt: Date.now() - 3600 * 1000 * 30,
          metadata: { category: 'academic', gateway: 'Torznab' }
        }
      ],
      nextCursor: undefined
    }
  }
}
