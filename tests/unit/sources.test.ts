import { describe, it, expect, beforeEach } from 'vitest'
import { initializeSources, sourceRegistry } from '../../server/sources'
import { BaseSourceAdapter } from '../../server/sources/adapter.base'

describe('Federated Source Adapters Ecosystem', () => {
  beforeEach(() => {
    initializeSources()
  })

  it('registers all federated source adapters', () => {
    const adapters = sourceRegistry.getAll()
    expect(adapters.length).toBeGreaterThanOrEqual(11)

    const ids = adapters.map(a => a.id)
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

  it('executes search on all adapters with circuit breaker isolation', async () => {
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
    expect(crawlAdapters.length).toBeGreaterThanOrEqual(8)

    const alistAdapter = sourceRegistry.get('alist_hub')
    expect(alistAdapter).toBeDefined()
    if (alistAdapter && 'crawl' in alistAdapter) {
      const crawlRes = await (alistAdapter as any).crawl()
      expect(crawlRes).toHaveProperty('items')
      expect(Array.isArray(crawlRes.items)).toBe(true)
    }
  })

  it('safely handles empty queries without throwing', async () => {
    const alistAdapter = sourceRegistry.get('alist_hub')
    expect(alistAdapter).toBeDefined()
    const results = await alistAdapter!.executeSearch({ q: '' })
    expect(results).toEqual([])
  })
})
