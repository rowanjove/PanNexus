import { BaseSourceAdapter, type CrawlResult } from '../adapter.base'
import type { RawResource, SearchQuery } from '~/shared/types'
import crypto from 'node:crypto'

export class MagnetIndexAdapter extends BaseSourceAdapter {
  readonly id = 'magnet_index'
  readonly name = '磁力与种子聚合网络'
  readonly type = 'torznab' as const
  override readonly priority = 90
  override readonly capabilities = {
    crawl: true,
    search: true,
    healthCheck: true
  }

  protected async search(query: SearchQuery, _signal: AbortSignal): Promise<RawResource[]> {
    const keyword = query.q.toLowerCase()
    const mockHash1 = crypto.createHash('sha1').update(`${keyword}_4k_bluray`).digest('hex')
    const mockHash2 = crypto.createHash('sha1').update(`${keyword}_1080p_web`).digest('hex')

    return [
      {
        title: `${query.q}.2024.2160p.UHD.BluRay.x265.TrueHD.7.1.Atmos`,
        url: `magnet:?xt=urn:btih:${mockHash1}&dn=${encodeURIComponent(query.q)}`,
        infohash: mockHash1,
        resourceType: 'magnet',
        provider: 'magnet',
        size: 58 * 1024 * 1024 * 1024,
        fileCount: 3,
        publishedAt: Date.now() - 3600 * 1000 * 4,
        files: [
          { filename: `${query.q}.2024.2160p.mkv`, sizeBytes: 57 * 1024 * 1024 * 1024, extension: 'mkv' },
          { filename: 'sample.mkv', sizeBytes: 200 * 1024 * 1024, extension: 'mkv' },
          { filename: 'poster.jpg', sizeBytes: 5 * 1024 * 1024, extension: 'jpg' }
        ],
        metadata: { resolution: '2160p', codec: 'HEVC', audio: 'TrueHD 7.1 Atmos' }
      },
      {
        title: `${query.q}.2024.1080p.WEB-DL.H264.AAC`,
        url: `magnet:?xt=urn:btih:${mockHash2}&dn=${encodeURIComponent(query.q)}`,
        infohash: mockHash2,
        resourceType: 'magnet',
        provider: 'magnet',
        size: 4 * 1024 * 1024 * 1024,
        fileCount: 1,
        publishedAt: Date.now() - 3600 * 1000 * 18,
        files: [
          { filename: `${query.q}.2024.1080p.mp4`, sizeBytes: 4 * 1024 * 1024 * 1024, extension: 'mp4' }
        ],
        metadata: { resolution: '1080p', codec: 'AVC' }
      }
    ]
  }

  protected async crawl(_cursor?: string): Promise<CrawlResult> {
    return {
      items: [],
      nextCursor: undefined
    }
  }
}
