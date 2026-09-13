import { describe, it, expect, vi } from 'vitest'
import { PanSearchAdapter } from '../../server/sources/implementations/pansearch.adapter'

describe('PanSearch Adapter', () => {
  it('instantiates correctly and handles empty queries', async () => {
    const adapter = new PanSearchAdapter()
    expect(adapter.id).toBe('pansearch_aggregate')
    expect(adapter.capabilities.search).toBe(true)

    const items = await adapter.executeSearch({ q: '' })
    expect(items).toEqual([])
  })

  it('parses simulated upstream PanSearch response into RawResources with extracted password', async () => {
    const adapter = new PanSearchAdapter()

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        list: [
          {
            title: '沙丘2 2024 4K 原画',
            content: '夸克网盘 https://pan.quark.cn/s/qk_dune2_4k 密码: d123',
            time: '2024-03-01T12:00:00Z'
          }
        ]
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    try {
      const items = await adapter.executeSearch({ q: '沙丘2' })
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('沙丘2 2024 4K 原画')
      expect(items[0].url).toBe('https://pan.quark.cn/s/qk_dune2_4k')
      expect(items[0].provider).toBe('quark')
      expect(items[0].password).toBe('d123')
      expect(items[0].metadata?.source).toBe('pansearch')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
