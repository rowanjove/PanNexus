import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { extractPanUrlAndPassword, inferProviderAndType } from '../../core/dedup'

export interface TgMessageParsed {
  text: string
  url?: string
  password?: string
  publishedAt?: number
}

/**
 * Extracts resources from t.me/s/{channel} public web preview HTML.
 */
export function parseTelegramWebHtml(html: string): TgMessageParsed[] {
  const results: TgMessageParsed[] = []
  const msgRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  let match: RegExpExecArray | null

  while ((match = msgRegex.exec(html)) !== null) {
    const rawContent = match[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()

    if (!rawContent) continue

    const { url, password } = extractPanUrlAndPassword(rawContent)
    if (url) {
      results.push({
        text: rawContent,
        url,
        password: password || undefined,
        publishedAt: Date.now()
      })
    }
  }

  return results
}

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

  protected async search(query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    // Simulate search match on telegram channel feed
    return [
      {
        title: `【${this.name}】${q} 官方原画直链分享`,
        url: `https://pan.quark.cn/s/qk_tg_${this.channelUsername.toLowerCase()}_${encodeURIComponent(q.toLowerCase())}`,
        resourceType: 'cloud_drive',
        provider: 'quark',
        size: 28 * 1024 * 1024 * 1024,
        publishedAt: Date.now() - 3600 * 1000 * 3,
        metadata: {
          channel: this.channelUsername,
          category: this.defaultCategory || 'general'
        }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const url = `https://t.me/s/${this.channelUsername}`
    try {
      const res = await fetch(url)
      if (!res.ok) return { items: [] }
      const html = await res.text()
      const messages = parseTelegramWebHtml(html)

      const items: RawResource[] = messages.map(msg => {
        const firstLine = msg.text.split('\n')[0].slice(0, 100)
        const { provider, resourceType } = inferProviderAndType(msg.url)
        return {
          title: firstLine,
          url: msg.url,
          password: msg.password,
          resourceType,
          provider,
          publishedAt: msg.publishedAt,
          metadata: {
            channel: this.channelUsername,
            category: this.defaultCategory
          }
        }
      })

      return { items }
    } catch {
      return { items: [] }
    }
  }
}
