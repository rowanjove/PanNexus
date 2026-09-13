import { describe, it, expect, vi } from 'vitest'
import { fetchDoubanHotKeywords } from '../../server/core/trending/douban'

describe('Douban Trending Movies Fetcher', () => {
  it('returns fallback hot keywords when network is unavailable or mock fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Network error')
    }))

    try {
      const keywords = await fetchDoubanHotKeywords(5)
      expect(keywords).toHaveLength(5)
      expect(keywords).toContain('流浪地球2')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('parses real Douban response successfully when available', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      subjects: [
        { id: '1', title: '沙丘2' },
        { id: '2', title: '周处除三害' },
        { id: '3', title: '热辣滚烫' }
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    try {
      const keywords = await fetchDoubanHotKeywords(2)
      expect(keywords).toHaveLength(2)
      expect(keywords[0]).toBe('沙丘2')
      expect(keywords[1]).toBe('周处除三害')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
