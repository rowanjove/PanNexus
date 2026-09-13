import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initializeSources, sourceRegistry } from '../../server/sources'

const emptyRss = `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`

describe('Federated Source Adapters Ecosystem', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(emptyRss, { status: 200, headers: { 'content-type': 'application/xml' } })))
    initializeSources()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers all federated source adapters', () => {
    const adapters = sourceRegistry.getAll()
    expect(adapters.length).toBeGreaterThanOrEqual(11)

    const ids = adapters.map(a => a.id)
    expect(ids).toContain('academic_torrents')
    expect(ids).toContain('qupansou_aggregate')
    expect(ids).toContain('magnet_index')
    expect(ids).toContain('pan_index')
    expect(ids).toContain('alist_hub')
    expect(ids).toContain('quark_share')
    expect(ids).toContain('115_vip_archive')
    expect(ids).toContain('aliyun_hub')
    expect(ids).toContain('dmhy_anime')
    expect(ids).toContain('nyaa_global')
    expect(ids).toContain('ebook_library')
    expect(ids).toContain('software_hub')
    expect(ids).toContain('tg_channel')
  })

  it('sorts search adapters by priority descending', () => {
    const searchAdapters = sourceRegistry.getSearchAdapters()
    expect(searchAdapters.length).toBeGreaterThan(0)

    for (let i = 0; i < searchAdapters.length - 1; i++) {
      expect(searchAdapters[i].priority).toBeGreaterThanOrEqual(searchAdapters[i + 1].priority)
    }
  })

  it('only enables live search on adapters with a real entry', () => {
    const liveIds = sourceRegistry.getSearchAdapters().map(a => a.id)
    expect(liveIds).toContain('nyaa_global')
    expect(liveIds).toContain('dmhy_anime')
    expect(liveIds).toContain('academic_torrents')
    expect(liveIds).toContain('qupansou_aggregate')
    expect(liveIds).toContain('ebook_library')
    expect(liveIds).toContain('software_hub')
    expect(liveIds).toContain('pan_index')
    expect(liveIds).toContain('quark_share')
    expect(liveIds).toContain('aliyun_hub')
    expect(liveIds).toContain('115_vip_archive')
    expect(liveIds).toContain('magnet_index')
    expect(liveIds).not.toContain('tg_channel')
  })

  it('executes search on live adapters with circuit breaker isolation', async () => {
    const adapters = sourceRegistry.getSearchAdapters()

    for (const adapter of adapters) {
      const results = await adapter.executeSearch({ q: '进击的巨人' })
      expect(Array.isArray(results)).toBe(true)
      expect(adapter.circuitBreaker.state).toBe('closed')
      expect(adapter.circuitBreaker.getHealthScore()).toBeGreaterThan(0.8)
    }
  })

  it('executes crawl on adapters supporting crawl', async () => {
    const crawlAdapters = sourceRegistry.getCrawlAdapters()
    expect(crawlAdapters.length).toBeGreaterThanOrEqual(3)

    const nyaa = sourceRegistry.get('nyaa_global')
    expect(nyaa).toBeDefined()
    const crawlRes = await nyaa!.executeCrawl()
    expect(crawlRes).toHaveProperty('items')
    expect(Array.isArray(crawlRes.items)).toBe(true)
  })

  it('safely handles empty queries without throwing', async () => {
    const nyaa = sourceRegistry.get('nyaa_global')
    expect(nyaa).toBeDefined()
    const results = await nyaa!.executeSearch({ q: '' })
    expect(results).toEqual([])
  })
})
