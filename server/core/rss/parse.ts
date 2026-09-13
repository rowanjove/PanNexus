import type { RawResource } from '~/shared/types'
import { inferProviderAndType, parseMagnetInfohash } from '../dedup'
import { safeFetch } from '../http/safe-fetch'

export interface RssItem {
  title: string
  link?: string
  enclosureUrl?: string
  enclosureLength?: number
  pubDate?: string
  description?: string
  infohash?: string
  seeders?: number
  leechers?: number
  sizeText?: string
}

function innerText(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = re.exec(block)
  if (!match) return undefined
  let text = match[1].trim()
  const cdataMatch = /^<!\[CDATA\[([\s\S]*?)\]\]>$/i.exec(text)
  if (cdataMatch) {
    text = cdataMatch[1]
  } else {
    text = decodeXmlEntities(text)
  }
  return text.trim()
}

function attr(block: string, tag: string, name: string): string | undefined {
  const re = new RegExp(`<${tag}\\s+([^>]*)\\/?>`, 'i')
  const match = re.exec(block)
  if (!match) return undefined
  const attrRe = new RegExp(`${name}=["']([^"']+)["']`, 'i')
  const found = attrRe.exec(match[1])
  return found ? decodeXmlEntities(found[1]) : undefined
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function parseSizeToBytes(raw?: string): number | undefined {
  if (!raw) return undefined
  const asInt = Number(raw)
  if (Number.isFinite(asInt) && asInt > 1000) return Math.round(asInt)

  const match = /([\d.]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB|T|G|M|K)?/i.exec(raw.trim())
  if (!match) return undefined
  const n = parseFloat(match[1])
  if (!Number.isFinite(n)) return undefined
  const unit = (match[2] || '').toUpperCase()
  const mul =
    unit.startsWith('T') ? 1024 ** 4 :
    unit.startsWith('G') ? 1024 ** 3 :
    unit.startsWith('M') ? 1024 ** 2 :
    unit.startsWith('K') ? 1024 :
    1
  return Math.round(n * mul)
}

/**
 * Minimal RSS 2.0 / Nyaa / DMHY item parser. No XML library required.
 */
export function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = innerText(block, 'title')
    if (!title) continue

    const enclosureUrl = attr(block, 'enclosure', 'url')
    const enclosureLength = attr(block, 'enclosure', 'length')
    const nyaaHash = innerText(block, 'nyaa:infoHash') || innerText(block, 'nyaa:infohash')
    const nyaaSeeders = innerText(block, 'nyaa:seeders')
    const nyaaLeechers = innerText(block, 'nyaa:leechers')
    const nyaaSize = innerText(block, 'nyaa:size')
    const sizeTag = innerText(block, 'size')

    items.push({
      title,
      link: innerText(block, 'link'),
      enclosureUrl,
      enclosureLength: enclosureLength ? parseInt(enclosureLength, 10) : undefined,
      pubDate: innerText(block, 'pubDate'),
      description: innerText(block, 'description'),
      infohash: nyaaHash ? nyaaHash.toLowerCase() : undefined,
      seeders: nyaaSeeders ? parseInt(nyaaSeeders, 10) : undefined,
      leechers: nyaaLeechers ? parseInt(nyaaLeechers, 10) : undefined,
      sizeText: nyaaSize || sizeTag
    })
  }

  return items
}

export function rssItemToRawResource(item: RssItem, extra?: Record<string, unknown>): RawResource | null {
  const magnetFromLink = [item.link, item.enclosureUrl].find(u => u?.startsWith('magnet:?'))
  const parsedMagnet = magnetFromLink ? parseMagnetInfohash(magnetFromLink) : { trackers: [] as string[] }
  const infohash = (item.infohash || parsedMagnet.infohash || '').toLowerCase() || undefined

  let url = magnetFromLink || (infohash ? `magnet:?xt=urn:btih:${infohash}&dn=${encodeURIComponent(item.title)}` : undefined) || item.enclosureUrl || item.link
  if (!url) return null

  const { provider, resourceType } = inferProviderAndType(url)
  const size = item.enclosureLength && item.enclosureLength > 1000
    ? item.enclosureLength
    : parseSizeToBytes(item.sizeText)

  return {
    title: item.title,
    url,
    infohash,
    resourceType: infohash || url.startsWith('magnet:?') ? 'magnet' : resourceType,
    provider: infohash || url.startsWith('magnet:?') ? 'magnet' : provider,
    size,
    publishedAt: item.pubDate ? Date.parse(item.pubDate) || Date.now() : Date.now(),
    metadata: {
      seeders: item.seeders,
      leechers: item.leechers,
      pageUrl: item.link,
      enclosureUrl: item.enclosureUrl,
      ...extra
    }
  }
}

export async function fetchRssResources(
  url: string,
  signal?: AbortSignal,
  extra?: Record<string, unknown>
): Promise<RawResource[]> {
  const res = await safeFetch(url, { signal, timeoutMs: 8000 })
  if (!res.ok) return []
  const xml = await res.text()
  return parseRssXml(xml)
    .map(item => rssItemToRawResource(item, extra))
    .filter((item): item is RawResource => item !== null)
}
