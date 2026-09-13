import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import { safeFetch } from '../../core/http/safe-fetch'

export interface OpenLibraryDoc {
  key?: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  isbn?: string[]
  language?: string[]
}

export class EbookAdapter extends BaseSourceAdapter {
  readonly id = 'ebook_library'
  readonly name = 'Open Library 公开图书文献'
  readonly type = 'api' as const
  override readonly priority = 78
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  private mapDoc(doc: OpenLibraryDoc): RawResource | null {
    if (!doc?.title) return null
    const authorStr = Array.isArray(doc.author_name) && doc.author_name.length > 0 ? ` [${doc.author_name.slice(0, 2).join(', ')}]` : ''
    const yearStr = doc.first_publish_year ? ` (${doc.first_publish_year})` : ''
    const fullTitle = `${doc.title}${authorStr}${yearStr}`
    const key = doc.key || ''
    const url = key ? `https://openlibrary.org${key}` : `https://openlibrary.org/search?q=${encodeURIComponent(doc.title)}`

    return {
      title: fullTitle,
      url,
      provider: 'unknown',
      resourceType: 'doc',
      publishedAt: doc.first_publish_year ? new Date(`${doc.first_publish_year}-01-01`).getTime() : Date.now(),
      metadata: {
        source: 'openlibrary',
        authors: doc.author_name,
        year: doc.first_publish_year,
        isbn: doc.isbn?.[0]
      }
    }
  }

  protected async search(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=25`
      const res = await safeFetch(url, {
        signal,
        timeoutMs: 6000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MetaSeek-OpenLibrary-Client/1.0'
        }
      })

      if (!res.ok) return []
      const json = await res.json() as { docs?: OpenLibraryDoc[] }
      const docs = Array.isArray(json?.docs) ? json.docs : []

      const items: RawResource[] = []
      for (const doc of docs) {
        const item = this.mapDoc(doc)
        if (item) items.push(item)
      }
      return items
    } catch {
      return []
    }
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    try {
      const res = await safeFetch('https://openlibrary.org/subjects/science.json?limit=25', {
        timeoutMs: 8000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MetaSeek-OpenLibrary-Client/1.0'
        }
      })
      if (!res.ok) return { items: [] }
      const data = await res.json() as { works?: Array<{ key: string; title: string; authors?: Array<{ name: string }>; first_publish_year?: number }> }
      const works = Array.isArray(data?.works) ? data.works : []

      const items: RawResource[] = []
      for (const w of works) {
        const mapped = this.mapDoc({
          key: w.key,
          title: w.title,
          author_name: w.authors?.map(a => a.name),
          first_publish_year: w.first_publish_year
        })
        if (mapped) items.push(mapped)
      }
      return { items }
    } catch {
      return { items: [] }
    }
  }
}
