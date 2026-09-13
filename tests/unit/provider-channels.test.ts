import { describe, it, expect } from 'vitest'
import { executeSearch } from '../../server/utils/db'
import type { Provider } from '../../shared/types'
import fs from 'node:fs'
import path from 'node:path'

describe('Full-Chain Provider and Channel Verification', () => {
  const allProviders: Provider[] = [
    'quark',
    'baidu',
    'aliyun',
    '115',
    '123pan',
    'tianyi',
    'mobile',
    'uc',
    'xunlei',
    'magnet',
    'torrent'
  ]

  it('verifies all 11 storage channels return active resources for Joy of Life (庆余年)', async () => {
    for (const provider of allProviders) {
      const res = await executeSearch({
        q: '庆余年',
        provider
      })

      expect(res.items.length, `Provider ${provider} should return results for 庆余年`).toBeGreaterThan(0)
      const canonical = res.items[0]
      expect(canonical.title).toContain('庆余年')

      const matchingRes = canonical.resources?.filter(r => r.provider === provider)
      expect(matchingRes?.length, `Resource with provider ${provider} should be in canonical.resources`).toBeGreaterThan(0)

      const resource = matchingRes![0]
      expect(resource.url).toBeTruthy()
      expect(resource.status).toBe('active')

      // Verify specific channel mechanics
      if (provider === 'magnet') {
        expect(resource.url).toMatch(/^magnet:\?xt=urn:btih:/)
      } else if (provider === 'torrent') {
        expect(resource.resourceType).toBe('torrent')
        expect(resource.url).toMatch(/\.torrent$/)
      } else if (['baidu', '115', 'tianyi', 'mobile'].includes(provider)) {
        expect(resource.password, `Provider ${provider} should have extraction code / password`).toBeTruthy()
      }
    }
  })

  it('verifies category filtering works accurately alongside provider filtering', async () => {
    // 庆余年 in TV category should find all 11 channels
    const tvSearch = await executeSearch({
      q: '庆余年',
      category: 'tv'
    })
    expect(tvSearch.items.length).toBeGreaterThan(0)
    for (const item of tvSearch.items) {
      expect(item.category).toBe('tv')
    }

    // 庆余年 in Book category should find the novel, not the TV show
    const bookSearch = await executeSearch({
      q: '庆余年',
      category: 'book'
    })
    expect(bookSearch.items.length).toBeGreaterThan(0)
    for (const item of bookSearch.items) {
      expect(item.category).toBe('book')
      expect(item.title).toContain('猫腻')
    }
  })

  it('verifies categories in pages/index.vue and pages/search.vue contain zero emojis', () => {
    const indexPath = path.resolve(process.cwd(), 'pages/index.vue')
    const searchPath = path.resolve(process.cwd(), 'pages/search.vue')

    const indexContent = fs.readFileSync(indexPath, 'utf-8')
    const searchContent = fs.readFileSync(searchPath, 'utf-8')

    // Emoji regex for Unicode Extended Pictographic
    const emojiRegex = /\p{Extended_Pictographic}/u

    // Check categoryList in index.vue
    const indexCategoryMatch = indexContent.match(/categoryList\s*=\s*\[([\s\S]*?)\]/)
    expect(indexCategoryMatch).toBeTruthy()
    expect(emojiRegex.test(indexCategoryMatch![1])).toBe(false)

    // Check categoryOptions in search.vue
    const searchCategoryMatch = searchContent.match(/categoryOptions.*?=\s*\[([\s\S]*?)\]/)
    expect(searchCategoryMatch).toBeTruthy()
    expect(emojiRegex.test(searchCategoryMatch![1])).toBe(false)
  })
})
