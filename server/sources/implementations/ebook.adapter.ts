import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'

export class EbookAdapter extends BaseSourceAdapter {
  readonly id = 'ebook_library'
  readonly name = '电子书与文献学术库'
  readonly type = 'api' as const
  override readonly priority = 78
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    const q = query.q.trim()
    if (!q) return []

    return [
      {
        title: `${q} 中文精排版 (EPUB+MOBI+PDF 带书签目录)`,
        url: `https://pan.quark.cn/s/qk_book_${encodeURIComponent(q.toLowerCase())}`,
        resourceType: 'cloud_drive',
        provider: 'quark',
        size: 85 * 1024 * 1024,
        fileCount: 3,
        publishedAt: Date.now() - 3600 * 1000 * 30,
        files: [
          { filename: `${q}.epub`, sizeBytes: 25 * 1024 * 1024, extension: 'epub' },
          { filename: `${q}.pdf`, sizeBytes: 60 * 1024 * 1024, extension: 'pdf' }
        ],
        metadata: { category: 'book', format: 'EPUB+PDF' }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return {
      items: [
        {
          title: '深入理解计算机系统 CSAPP 第三版 中文版 PDF 高清彩版',
          url: 'https://pan.baidu.com/s/1csapp_3rd_edition_pdf',
          password: 'book',
          resourceType: 'cloud_drive',
          provider: 'baidu',
          size: 140 * 1024 * 1024,
          fileCount: 1,
          publishedAt: Date.now() - 3600 * 1000 * 150,
          metadata: { category: 'book', format: 'PDF' }
        }
      ],
      nextCursor: undefined
    }
  }
}
