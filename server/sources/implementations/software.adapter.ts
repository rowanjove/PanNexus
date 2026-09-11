import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'

export class SoftwareAdapter extends BaseSourceAdapter {
  readonly id = 'software_hub'
  readonly name = '实用软件与开源代码发布站'
  readonly type = 'api' as const
  override readonly priority = 76
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
        title: `${q} 2024 最新便携版 (Windows x64 + macOS AppleSilicon 免安装)`,
        url: `https://pan.quark.cn/s/qk_app_${encodeURIComponent(q.toLowerCase())}`,
        resourceType: 'cloud_drive',
        provider: 'quark',
        size: 850 * 1024 * 1024,
        fileCount: 2,
        publishedAt: Date.now() - 3600 * 1000 * 16,
        files: [
          { filename: `${q}_x64_portable.zip`, sizeBytes: 420 * 1024 * 1024, extension: 'zip' },
          { filename: `${q}_arm64.dmg`, sizeBytes: 430 * 1024 * 1024, extension: 'dmg' }
        ],
        metadata: { category: 'software', version: '2024.1' }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return {
      items: [
        {
          title: 'Blender 4.3 LTS 官方完整安装包 + 中文材质预设包 夸克网盘',
          url: 'https://pan.quark.cn/s/qk_blender_4_3_lts',
          resourceType: 'cloud_drive',
          provider: 'quark',
          size: 1200 * 1024 * 1024,
          publishedAt: Date.now() - 3600 * 1000 * 60,
          metadata: { category: 'software', version: '4.3 LTS' }
        }
      ],
      nextCursor: undefined
    }
  }
}
