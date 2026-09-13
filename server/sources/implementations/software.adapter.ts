import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { safeFetch } from '../../core/http/safe-fetch'

export interface GitHubRepoItem {
  id: number
  name: string
  full_name: string
  html_url: string
  description?: string
  stargazers_count: number
  language?: string
  updated_at: string
}

export class SoftwareAdapter extends BaseSourceAdapter {
  readonly id = 'software_hub'
  readonly name = 'GitHub 开源软件与发布库'
  readonly type = 'api' as const
  override readonly priority = 79
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  private mapRepo(repo: GitHubRepoItem): RawResource | null {
    if (!repo?.name || !repo?.html_url) return null
    const stars = repo.stargazers_count ? ` ★${repo.stargazers_count}` : ''
    const lang = repo.language ? ` [${repo.language}]` : ''
    const title = `${repo.full_name}${lang}${stars}: ${repo.description || repo.name}`.slice(0, 150)

    return {
      title,
      url: `${repo.html_url}/releases`,
      provider: 'unknown',
      resourceType: 'software',
      publishedAt: repo.updated_at ? Date.parse(repo.updated_at) : Date.now(),
      metadata: {
        source: 'github',
        repo: repo.full_name,
        stars: repo.stargazers_count,
        language: repo.language,
        homeUrl: repo.html_url
      }
    }
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    // 1. If user filtered by non-software categories, skip GitHub entirely
    if (query.category && !['software', 'other', 'all'].includes(query.category)) {
      return []
    }
    if (query.type && !['other', 'all'].includes(query.type)) {
      return []
    }

    // 2. Only search GitHub if query has software/tech intent or explicitly requested
    const isTechIntent = /(?:app|client|github|sdk|cli|bot|gui|lib|software|tool|player|driver|os|server|macos|windows|linux|android|apk|exe|dmg|插件|脚本|源码|开源|库|框架|工具|软件|播放器)/i.test(q)
    const isExplicitSoftware = query.category === 'software' || query.type === 'other'

    // If query has no tech intent and user didn't explicitly pick software/other, avoid polluting search results with repos
    if (!isTechIntent && !isExplicitSoftware) {
      return []
    }

    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=3`
      const res = await safeFetch(url, {
        signal,
        timeoutMs: 6000,
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'MetaSeek-Software-Client/1.0'
        }
      })

      if (!res.ok) return []
      const json = await res.json() as { items?: GitHubRepoItem[] }
      const items = Array.isArray(json?.items) ? json.items : []

      const resources: RawResource[] = []
      for (const item of items) {
        const mapped = this.mapRepo(item)
        if (mapped) resources.push(mapped)
      }
      return resources
    } catch {
      return []
    }
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    try {
      const url = 'https://api.github.com/search/repositories?q=stars:>5000+topic:tool&sort=stars&order=desc&per_page=20'
      const res = await safeFetch(url, {
        timeoutMs: 8000,
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'MetaSeek-Software-Client/1.0'
        }
      })

      if (!res.ok) return { items: [] }
      const json = await res.json() as { items?: GitHubRepoItem[] }
      const items = Array.isArray(json?.items) ? json.items : []

      const resources: RawResource[] = []
      for (const item of items) {
        const mapped = this.mapRepo(item)
        if (mapped) resources.push(mapped)
      }
      return { items }
    } catch {
      return { items: [] }
    }
  }
}
