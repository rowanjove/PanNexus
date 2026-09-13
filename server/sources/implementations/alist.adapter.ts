import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { isSafeUrl } from '../../core/security/ssrf'
import { safeFetch } from '../../core/http/safe-fetch'

export class AlistAdapter extends BaseSourceAdapter {
  readonly id = 'alist_hub'
  readonly name = 'AList 开放目录（需配置 ALIST_BASE_URL）'
  readonly type = 'api' as const
  override readonly priority = 88
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  private baseUrl?: string
  private token?: string

  constructor(baseUrl?: string, token?: string) {
    super()
    this.baseUrl = baseUrl
    this.token = token
  }

  private resolveConfig() {
    return {
      baseUrl: (this.baseUrl || (typeof process !== 'undefined' ? process.env.ALIST_BASE_URL : undefined) || '').replace(/\/$/, ''),
      token: this.token || (typeof process !== 'undefined' ? process.env.ALIST_TOKEN : undefined)
    }
  }

  private mapItem(item: any): RawResource | null {
    const name = String(item?.name || item?.title || '').trim()
    if (!name) return null
    const path = String(item?.path || item?.parent || '')
    const { baseUrl } = this.resolveConfig()
    const url = item?.url || `${baseUrl}/d${path ? `${path.startsWith('/') ? path : `/${path}`}` : ''}/${encodeURIComponent(name)}`
    return {
      title: name,
      url,
      resourceType: 'http',
      provider: 'unknown',
      size: Number(item?.size || 0) || undefined,
      publishedAt: item?.modified ? Date.parse(item.modified) : Date.now(),
      metadata: { source: 'alist' }
    }
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []
    const { baseUrl, token } = this.resolveConfig()
    if (!baseUrl || !isSafeUrl(baseUrl).safe) return []

    const res = await safeFetch(`${baseUrl}/api/fs/search`, {
      method: 'POST',
      signal,
      timeoutMs: 8000,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {})
      },
      body: JSON.stringify({ keywords: q, parent: '/', page: 1, per_page: 20, scope: 0 })
    })
    if (!res.ok) return []
    const data = await res.json() as any
    const list = data?.data?.content || data?.data?.list || []
    return (Array.isArray(list) ? list : []).map((item: any) => this.mapItem(item)).filter(Boolean) as RawResource[]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    const { baseUrl, token } = this.resolveConfig()
    if (!baseUrl || !isSafeUrl(baseUrl).safe) return { items: [] }

    const res = await safeFetch(`${baseUrl}/api/fs/list`, {
      method: 'POST',
      timeoutMs: 8000,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {})
      },
      body: JSON.stringify({ path: '/', page: 1, per_page: 30 })
    })
    if (!res.ok) return { items: [] }
    const data = await res.json() as any
    const list = data?.data?.content || []
    return {
      items: (Array.isArray(list) ? list : []).map((item: any) => this.mapItem(item)).filter(Boolean) as RawResource[]
    }
  }
}
