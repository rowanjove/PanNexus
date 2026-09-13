import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { extractPanResourcesFromText } from '../../core/dedup/pan-extractor'
import { inferProviderAndType } from '../../core/dedup'
import { safeFetch } from '../../core/http/safe-fetch'

export interface TgMessageParsed {
  text: string
  url?: string
  password?: string
  provider?: string
  resourceType?: string
  infohash?: string
  title?: string
  publishedAt?: number
}

/**
 * Extracts resources from t.me/s/{channel} public web preview HTML using the intelligent pan extractor.
 */
export function parseTelegramWebHtml(html: string): TgMessageParsed[] {
  const results: TgMessageParsed[] = []
  const msgRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  let match: RegExpExecArray | null

  while ((match = msgRegex.exec(html)) !== null) {
    const hrefs: string[] = []
    const hrefRe = /href=["'](https?:\/\/[^"']+|magnet:\?[^"']+)["']/gi
    let hrefMatch: RegExpExecArray | null
    while ((hrefMatch = hrefRe.exec(match[1])) !== null) {
      hrefs.push(hrefMatch[1])
    }

    const rawContent = match[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()

    if (!rawContent && hrefs.length === 0) continue

    const combined = `${rawContent}\n${hrefs.join('\n')}`
    const extracted = extractPanResourcesFromText(combined)

    for (const item of extracted) {
      results.push({
        text: rawContent,
        url: item.url,
        password: item.password,
        provider: item.provider,
        resourceType: item.resourceType,
        infohash: item.infohash,
        title: item.title,
        publishedAt: Date.now()
      })
    }
  }

  return results
}

export function parseTelegramBeforeCursor(html: string): string | undefined {
  const match = /data-before=["'](\d+)["']/.exec(html)
  return match ? match[1] : undefined
}

export const COMMUNITY_TG_CHANNELS: TgGenericConfig[] = [
  // 综合聚合与搜索
  { channelUsername: 'tgsearchers6', channelName: 'TG 综合盘搜频道', defaultCategory: 'general', priority: 88 },
  { channelUsername: 'yunpanx', channelName: '云盘 X 综合资源', defaultCategory: 'general', priority: 86 },

  // 阿里云盘专区
  { channelUsername: 'Aliyun_4K_Movies', channelName: '阿里 4K 影视频道', defaultCategory: 'movie', priority: 85 },
  { channelUsername: 'shareAliyun', channelName: '阿里云盘资源分享', defaultCategory: 'general', priority: 80 },

  // 夸克与 UC 专区
  { channelUsername: 'Quark_Movies', channelName: '夸克影视优质频道', defaultCategory: 'movie', priority: 85 },
  { channelUsername: 'ucquark', channelName: 'UC与夸克影视专线', defaultCategory: 'movie', priority: 80 },
  { channelUsername: 'yunpanuc', channelName: 'UC 网盘精品资源', defaultCategory: 'general', priority: 77 },

  // 百度网盘专区
  { channelUsername: 'BaiduCloudDisk', channelName: '百度网盘精选资源', defaultCategory: 'general', priority: 82 },
  { channelUsername: 'bdwpzhpd', channelName: '百度网盘综合频道', defaultCategory: 'general', priority: 78 },

  // 115 网盘专区
  { channelUsername: 'Lsp115', channelName: '115 优质垂直分享', defaultCategory: 'general', priority: 83 },
  { channelUsername: 'oneonefivewpfx', channelName: '115 优质网盘分享', defaultCategory: 'general', priority: 76 },
  { channelUsername: 'Channel_Shares_115', channelName: '115 影视特种分享', defaultCategory: 'movie', priority: 77 },

  // 迅雷网盘专区
  { channelUsername: 'XunLeiPinDao', channelName: '迅雷网盘官方频道', defaultCategory: 'general', priority: 82 },
  { channelUsername: 'yunpanxunlei', channelName: '迅雷与网盘聚合', defaultCategory: 'general', priority: 74 },

  // 天翼云盘专区
  { channelUsername: 'tianyifc', channelName: '天翼云盘资源广场', defaultCategory: 'general', priority: 81 },
  { channelUsername: 'tianyirigeng', channelName: '天翼云盘日更大全', defaultCategory: 'general', priority: 79 },

  // 123 网盘专区
  { channelUsername: 'yp123pan', channelName: '123 网盘优质资源', defaultCategory: 'general', priority: 80 },
  { channelUsername: 'zyfb123', channelName: '123 网盘资源发布', defaultCategory: 'general', priority: 78 },

  // 中国移动云盘专区
  { channelUsername: 'yunpan139', channelName: '移动云盘精品汇', defaultCategory: 'general', priority: 77 },

  // 垂直特色频道
  { channelUsername: 'Q_dongman', channelName: '动漫动漫 ACG 专线', defaultCategory: 'anime', priority: 84 },
  { channelUsername: 'Oscar_4Kmovies', channelName: '奥斯卡高分电影库', defaultCategory: 'movie', priority: 82 }
]

export interface TgGenericConfig {
  channelUsername: string
  channelName: string
  defaultCategory?: string
  priority?: number
}

export class TelegramGenericAdapter extends BaseSourceAdapter {
  readonly id: string
  readonly name: string
  readonly type = 'telegram' as const
  override readonly priority: number
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  private channelUsername: string
  private defaultCategory?: string

  constructor(config: TgGenericConfig) {
    super()
    this.channelUsername = config.channelUsername
    this.name = config.channelName
    this.id = `tg_${config.channelUsername.toLowerCase()}`
    this.priority = config.priority ?? 75
    this.defaultCategory = config.defaultCategory
  }

  private toRaw(msg: TgMessageParsed): RawResource {
    const title = (msg.title || msg.text.split('\n')[0]).slice(0, 120)
    const inferred = inferProviderAndType(msg.url)
    const provider = msg.provider || inferred.provider
    const resourceType = (msg.resourceType as any) || inferred.resourceType
    return {
      title,
      url: msg.url,
      password: msg.password,
      infohash: msg.infohash,
      resourceType,
      provider,
      publishedAt: msg.publishedAt,
      metadata: {
        channel: this.channelUsername,
        category: this.defaultCategory
      }
    }
  }

  private async fetchMessages(cursor?: string, signal?: AbortSignal): Promise<{ items: TgMessageParsed[]; nextCursor?: string; html: string }> {
    const url = cursor
      ? `https://t.me/s/${this.channelUsername}?before=${encodeURIComponent(cursor)}`
      : `https://t.me/s/${this.channelUsername}`
    const res = await safeFetch(url, { signal, timeoutMs: 8000 })
    if (!res.ok) return { items: [], html: '' }
    const html = await res.text()
    return {
      items: parseTelegramWebHtml(html),
      nextCursor: parseTelegramBeforeCursor(html),
      html
    }
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim().toLowerCase()
    if (!q) return []
    const { items } = await this.fetchMessages(undefined, signal)
    return items
      .filter(msg => msg.text.toLowerCase().includes(q) || (msg.url || '').toLowerCase().includes(q))
      .map(msg => this.toRaw(msg))
  }

  protected async crawl(cursor?: string): Promise<CrawlResult> {
    const { items, nextCursor } = await this.fetchMessages(cursor)
    return {
      items: items.map(msg => this.toRaw(msg)),
      nextCursor
    }
  }
}
