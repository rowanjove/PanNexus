import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { processCrawlJob } from '../../server/queues/crawl-consumer'
import { handleCronScheduler } from '../../server/utils/scheduler'
import { initializeSources } from '../../server/sources'

const nyaaRss = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:nyaa="https://nyaa.si/xmlns/nyaa" version="2.0">
  <channel>
    <item>
      <title>Sample Show 01 1080p</title>
      <link>https://nyaa.si/view/1</link>
      <nyaa:infoHash>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</nyaa:infoHash>
      <enclosure url="https://nyaa.si/download/1.torrent" length="1000" type="application/x-bittorrent" />
    </item>
    <item>
      <title>Sample Show 02 1080p</title>
      <link>https://nyaa.si/view/2</link>
      <nyaa:infoHash>bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb</nyaa:infoHash>
      <enclosure url="https://nyaa.si/download/2.torrent" length="1000" type="application/x-bittorrent" />
    </item>
  </channel>
</rss>`

describe('Queue & Crawl Scheduler System', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const href = String(url)
      if (href.includes('nyaa.si')) {
        return new Response(nyaaRss, { status: 200 })
      }
      return new Response('<?xml version="1.0"?><rss><channel></channel></rss>', { status: 200 })
    }))
    initializeSources()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('processes crawl job and returns newly crawled resources', async () => {
    const mockQueue: any[] = []
    const mockEnv = {
      CRAWL_QUEUE: {
        send: async (msg: any) => mockQueue.push(msg)
      }
    }

    const result = await processCrawlJob({ type: 'crawl_source', sourceId: 'nyaa_global' }, mockEnv)

    expect(result.fetched).toBe(2)
    expect(result.inserted).toBe(0)
    expect(result.nextCursor).toBeUndefined()
  })

  it('cron scheduler enumerates crawl adapters and dispatches queue jobs', async () => {
    const mockQueue: any[] = []
    const mockEnv = {
      CRAWL_QUEUE: {
        send: async (msg: any) => mockQueue.push(msg)
      }
    }

    const { enqueued } = await handleCronScheduler(mockEnv)

    expect(enqueued).toBeGreaterThan(0)
    expect(mockQueue.some(job => job.sourceId === 'nyaa_global')).toBe(true)
  })
})
