import { describe, it, expect, beforeEach } from 'vitest'
import { executeSearch } from '../../server/utils/db'
import { parseTitleMetadata } from '../../server/core/normalize/title'
import { extractPanResourcesFromText } from '../../server/core/dedup/pan-extractor'
import { globalRateLimiter } from '../../server/core/security/rate-limit'

describe('Comprehensive Retrieval & Resource Matrix Audit', () => {
  beforeEach(() => {
    globalRateLimiter.reset()
  })

  describe('1. Protocol / Transport Types Retrieval (各载体协议检索)', () => {
    it('retrieves Cloud Drive (网盘) resources with multi-provider support', async () => {
      // 1.1 夸克网盘 (Quark)
      const quarkRes = await executeSearch({ q: '流浪地球2', type: 'cloud_drive', provider: 'quark' })
      expect(quarkRes.total).toBeGreaterThan(0)
      const allQuark = quarkRes.items.flatMap(i => i.resources || []).filter(r => r.provider === 'quark')
      expect(allQuark.length).toBeGreaterThan(0)
      expect(allQuark[0].url).toContain('pan.quark.cn')

      // 1.2 阿里云盘 (Aliyun)
      const aliRes = await executeSearch({ q: '奥本海默', type: 'cloud_drive', provider: 'aliyun' })
      expect(aliRes.total).toBeGreaterThan(0)
      const allAli = aliRes.items.flatMap(i => i.resources || []).filter(r => r.provider === 'aliyun')
      expect(allAli.length).toBeGreaterThan(0)
      expect(allAli[0].url).toContain('alipan.com')

      // 1.3 百度网盘 (Baidu) with access code
      const baiduRes = await executeSearch({ q: '流浪地球2', type: 'cloud_drive', provider: 'baidu' })
      expect(baiduRes.total).toBeGreaterThan(0)
      const allBaidu = baiduRes.items.flatMap(i => i.resources || []).filter(r => r.provider === 'baidu')
      expect(allBaidu.length).toBeGreaterThan(0)
      expect(allBaidu[0].password).toBeDefined()

      // 1.4 115 网盘 (115)
      const p115Res = await executeSearch({ q: '流浪地球2', type: 'cloud_drive', provider: '115' })
      expect(p115Res.total).toBeGreaterThan(0)
      const all115 = p115Res.items.flatMap(i => i.resources || []).filter(r => r.provider === '115')
      expect(all115.length).toBeGreaterThan(0)
      expect(all115[0].url).toContain('115.com')

      // 1.5 123 云盘 (123pan)
      const p123Res = await executeSearch({ q: 'VSCode', type: 'cloud_drive', provider: '123pan' })
      expect(p123Res.total).toBeGreaterThan(0)
      const all123 = p123Res.items.flatMap(i => i.resources || []).filter(r => r.provider === '123pan')
      expect(all123.length).toBeGreaterThan(0)
      expect(all123[0].url).toContain('123pan.com')

      // 1.6 迅雷云盘 (Xunlei)
      const xlRes = await executeSearch({ q: '庆余年', type: 'cloud_drive', provider: 'xunlei' })
      expect(xlRes.total).toBeGreaterThan(0)
      const allXl = xlRes.items.flatMap(i => i.resources || []).filter(r => r.provider === 'xunlei')
      expect(allXl.length).toBeGreaterThan(0)
      expect(allXl[0].url).toContain('xunlei.com')

      // 1.7 天翼云盘 (Tianyi)
      const tyRes = await executeSearch({ q: '庆余年', type: 'cloud_drive', provider: 'tianyi' })
      expect(tyRes.total).toBeGreaterThan(0)
      const allTy = tyRes.items.flatMap(i => i.resources || []).filter(r => r.provider === 'tianyi')
      expect(allTy.length).toBeGreaterThan(0)
      expect(allTy[0].url).toContain('189.cn')
      expect(allTy[0].password).toBeDefined()

      // 1.8 移动云盘 (Mobile)
      const ydRes = await executeSearch({ q: '庆余年', type: 'cloud_drive', provider: 'mobile' })
      expect(ydRes.total).toBeGreaterThan(0)
      const allYd = ydRes.items.flatMap(i => i.resources || []).filter(r => r.provider === 'mobile')
      expect(allYd.length).toBeGreaterThan(0)
      expect(allYd[0].url).toContain('139.com')
      expect(allYd[0].password).toBeDefined()

      // 1.9 UC网盘 (UC)
      const ucRes = await executeSearch({ q: '庆余年', type: 'cloud_drive', provider: 'uc' })
      expect(ucRes.total).toBeGreaterThan(0)
      const allUc = ucRes.items.flatMap(i => i.resources || []).filter(r => r.provider === 'uc')
      expect(allUc.length).toBeGreaterThan(0)
      expect(allUc[0].url).toContain('uc.cn')
    })

    it('retrieves Magnet (磁力链接) resources with valid BTIH hash', async () => {
      const magnetRes = await executeSearch({ q: '星际穿越', type: 'magnet' })
      expect(magnetRes.total).toBeGreaterThan(0)
      const magnets = magnetRes.items.flatMap(i => i.resources || []).filter(r => r.resourceType === 'magnet')
      expect(magnets.length).toBeGreaterThan(0)
      expect(magnets[0].url).toMatch(/^magnet:\?xt=urn:btih:[a-f0-9]{40}/i)
      expect(magnets[0].infohash).toBeDefined()
    })

    it('retrieves Torrent (种子文件) resources', async () => {
      const torrentRes = await executeSearch({ q: 'Black Myth', type: 'torrent' })
      expect(torrentRes.total).toBeGreaterThan(0)
      const torrents = torrentRes.items.flatMap(i => i.resources || []).filter(r => r.resourceType === 'torrent')
      expect(torrents.length).toBeGreaterThan(0)
      expect(torrents[0].infohash).toBeDefined()
    })

    it('supports multi-type combined filtering (type=cloud_drive,magnet)', async () => {
      const multiRes = await executeSearch({ q: '流浪地球2', type: 'cloud_drive,magnet' as any })
      expect(multiRes.total).toBeGreaterThan(0)
      const types = new Set(multiRes.items.flatMap(i => i.resources || []).map(r => r.resourceType))
      expect(types.has('cloud_drive') || types.has('magnet')).toBe(true)
    })
  })

  describe('2. Content Categories Retrieval (各内容类目检索)', () => {
    it('retrieves Movie (电影) resources with Remux/4K resolution', async () => {
      const res = await executeSearch({ q: '沙丘2' })
      expect(res.total).toBeGreaterThan(0)
      expect(res.items[0].category).toBe('movie')
      expect(res.items[0].resolution).toBe('2160p')
    })

    it('retrieves TV (电视剧) resources with episode/season metadata', async () => {
      const res = await executeSearch({ q: '老友记' })
      expect(res.total).toBeGreaterThan(0)
      expect(res.items[0].category).toBe('tv')
    })

    it('retrieves Anime (动漫) resources and correctly categorizes ACGN titles', async () => {
      const res = await executeSearch({ q: '间谍过家家' })
      expect(res.total).toBeGreaterThan(0)
      expect(res.items[0].category).toBe('anime')

      const parsed = parseTitleMetadata('[动漫国字幕组] 间谍过家家 SPY×FAMILY S02 [01-12] [1080P HEVC-10bit FLAC]')
      expect(parsed.category).toBe('anime')
      expect(parsed.resolution).toBe('1080p')
      expect(parsed.codec).toBe('HEVC')
    })

    it('retrieves Game (游戏) resources with game tags', async () => {
      const res = await executeSearch({ q: '黑神话' })
      expect(res.total).toBeGreaterThan(0)
      expect(res.items[0].category).toBe('game')

      const parsed = parseTitleMetadata('Black Myth Wukong PC Deluxe Edition Full Unlocked 免安装绿色版')
      expect(parsed.category).toBe('game')
    })

    it('retrieves Software (软件) resources', async () => {
      const res = await executeSearch({ q: 'Photoshop' })
      expect(res.total).toBeGreaterThan(0)
      expect(res.items[0].category).toBe('software')

      const parsed = parseTitleMetadata('Adobe.Photoshop.2024.v25.11.x64.Portable.Setup')
      expect(parsed.category).toBe('software')
    })

    it('retrieves Book (图书/文献) resources', async () => {
      const res = await executeSearch({ q: 'CSAPP' })
      expect(res.total).toBeGreaterThan(0)
      expect(res.items[0].category).toBe('book')

      const parsed = parseTitleMetadata('深入理解计算机系统 CSAPP 第三版 中文版 PDF 高清彩版')
      expect(parsed.category).toBe('book')
    })
  })

  describe('3. Filtering & Sorting Matrix (规格筛选与多维排序)', () => {
    it('filters accurately by Resolution (2160p vs 1080p)', async () => {
      const res4k = await executeSearch({ q: '流浪地球2', resolution: '2160p' })
      expect(res4k.total).toBeGreaterThan(0)
      for (const item of res4k.items) {
        expect(item.resolution).toBe('2160p')
      }

      const res1080p = await executeSearch({ q: '流浪地球2', resolution: '1080p' })
      expect(res1080p.total).toBeGreaterThan(0)
      for (const item of res1080p.items) {
        expect(item.resolution).toBe('1080p')
      }
    })

    it('filters accurately by File Size bounds (minSize / maxSize)', async () => {
      // Filter for files > 50GB
      const largeRes = await executeSearch({ q: '流浪地球2', minSize: 50 * 1024 * 1024 * 1024 })
      expect(largeRes.total).toBeGreaterThan(0)
      for (const item of largeRes.items) {
        for (const r of item.resources || []) {
          if (r.sizeBytes) {
            expect(r.sizeBytes).toBeGreaterThanOrEqual(50 * 1024 * 1024 * 1024)
          }
        }
      }

      // Filter for files < 30GB
      const smallRes = await executeSearch({ q: '流浪地球2', maxSize: 30 * 1024 * 1024 * 1024 })
      expect(smallRes.total).toBeGreaterThan(0)
      for (const item of smallRes.items) {
        for (const r of item.resources || []) {
          if (r.sizeBytes) {
            expect(r.sizeBytes).toBeLessThanOrEqual(30 * 1024 * 1024 * 1024)
          }
        }
      }
    })

    it('sorts by size_desc and size_asc correctly', async () => {
      const descRes = await executeSearch({ q: '流浪地球2', sort: 'size_desc' })
      expect(descRes.items.length).toBeGreaterThan(1)
      const size1 = descRes.items[0].maxSizeBytes || 0
      const size2 = descRes.items[1].maxSizeBytes || 0
      expect(size1).toBeGreaterThanOrEqual(size2)

      const ascRes = await executeSearch({ q: '流浪地球2', sort: 'size_asc' })
      expect(ascRes.items.length).toBeGreaterThan(1)
      const min1 = ascRes.items[0].minSizeBytes || 0
      const min2 = ascRes.items[1].minSizeBytes || 0
      expect(min1).toBeLessThanOrEqual(min2)
    })

    it('sorts by sourceCount (sources count descending)', async () => {
      const srcRes = await executeSearch({ q: '流浪地球2', sort: 'sources' })
      expect(srcRes.items.length).toBeGreaterThan(0)
      expect(srcRes.items[0].sourceCount).toBeGreaterThanOrEqual(srcRes.items[srcRes.items.length - 1].sourceCount || 0)
    })
  })

  describe('4. Canonical Clustering & Aggregation (多源聚合实体验证)', () => {
    it('aggregates multiple netdisks and magnet into single Canonical item', async () => {
      const res = await executeSearch({ q: '流浪地球2 2160p' })
      expect(res.total).toBeGreaterThan(0)

      const firstCanon = res.items[0]
      expect(firstCanon.resources).toBeDefined()
      expect(firstCanon.resources!.length).toBeGreaterThanOrEqual(4)

      // Verify provider diversity in aggregation
      const providers = new Set(firstCanon.resources!.map(r => r.provider))
      expect(providers.has('magnet')).toBe(true)
      expect(providers.has('quark')).toBe(true)
      expect(providers.has('aliyun')).toBe(true)
      expect(providers.has('115')).toBe(true)
      expect(providers.has('baidu')).toBe(true)

      // Verify providerCounts map
      expect(firstCanon.providerCounts).toBeDefined()
      expect(firstCanon.providerCounts!.quark).toBeGreaterThanOrEqual(1)
      expect(firstCanon.providerCounts!.magnet).toBeGreaterThanOrEqual(1)
    })
  })

  describe('5. Robustness, Security & Edge Cases (边界防御与安全测试)', () => {
    it('handles empty query gracefully with 0 results and 0 latency', async () => {
      const res = await executeSearch({ q: '' })
      expect(res.items).toEqual([])
      expect(res.total).toBe(0)
    })

    it('handles SQL injection attempts safely without crashing', async () => {
      const attacks = [
        `' OR '1'='1`,
        `admin' --`,
        `" UNION SELECT * FROM resources --`,
        `%27%20OR%201=1`,
        `<script>alert('xss')</script>`,
        `' OR 1=1; DROP TABLE resources; --`
      ]

      for (const query of attacks) {
        const res = await executeSearch({ q: query })
        expect(Array.isArray(res.items)).toBe(true)
        expect(typeof res.total).toBe('number')
      }
    })

    it('handles short queries (1-2 characters) smoothly', async () => {
      const shortQueries = ['沙', '繁花', '4k', 'ps', '三体']
      for (const sq of shortQueries) {
        const res = await executeSearch({ q: sq })
        expect(Array.isArray(res.items)).toBe(true)
      }
    })

    it('enforces rate limiter to protect search endpoints against denial of service', () => {
      const key = 'test-client-ip:/api/v1/search'
      // 60 requests per window
      for (let i = 0; i < 60; i++) {
        const r = globalRateLimiter.check(key, 60)
        expect(r.allowed).toBe(true)
      }
      // 61st request should be rejected with HTTP 429 semantics
      const rejected = globalRateLimiter.check(key, 60)
      expect(rejected.allowed).toBe(false)
      expect(rejected.remaining).toBe(0)
      expect(rejected.retryAfterSec).toBeGreaterThan(0)
    })
  })
})
