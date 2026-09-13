import { describe, it, expect, afterEach, vi } from 'vitest'
import { PanIndexAdapter } from '../../server/sources/implementations/pan-index.adapter'
import { QuarkShareAdapter } from '../../server/sources/implementations/quark-share.adapter'
import { AliyunHubAdapter } from '../../server/sources/implementations/aliyun-hub.adapter'
import { Pan115ArchiveAdapter } from '../../server/sources/implementations/pan115-archive.adapter'
import { MagnetIndexAdapter } from '../../server/sources/implementations/magnet-index.adapter'

describe('Upgraded Placeholders Live Adapters', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('searches PanTa netdisk index and extracts pan links', async () => {
    const mockHtml = `
      <div class="result">
        <h3>三体全集 夸克网盘分享</h3>
        <p>链接：https://pan.quark.cn/s/112233445566 提取码：7890 永久有效</p>
      </div>
    `
    vi.stubGlobal('fetch', vi.fn(async () => new Response(mockHtml, { status: 200 })))

    const adapter = new PanIndexAdapter()
    const results = await adapter.executeSearch({ q: '三体' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].url).toContain('pan.quark.cn/s/112233445566')
    expect(results[0].password).toBe('7890')
    expect(results[0].metadata?.source).toBe('panta')
  })

  it('searches Quark4K and parses 4K movie resources', async () => {
    const mockJson = {
      data: {
        list: [
          {
            title: '星际穿越 4K REMUX 杜比视界',
            url: 'https://pan.quark.cn/s/interstellar4k'
          }
        ]
      }
    }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockJson), { status: 200 })))

    const adapter = new QuarkShareAdapter()
    const results = await adapter.executeSearch({ q: '星际穿越' })
    expect(results.length).toBe(1)
    expect(results[0].title).toContain('星际穿越')
    expect(results[0].provider).toBe('quark')
    expect(results[0].metadata?.source).toBe('quark4k')
    expect(results[0].metadata?.resolution).toBe('4k')
  })

  it('searches AliyunHub and filters Aliyun links', async () => {
    const mockHtml = `
      <div>
        <p>沙丘2 阿里云盘原画：https://www.alipan.com/s/abcdefghijk 提取码：abcd 欢迎转存</p>
      </div>
    `
    vi.stubGlobal('fetch', vi.fn(async () => new Response(mockHtml, { status: 200 })))

    const adapter = new AliyunHubAdapter()
    const results = await adapter.executeSearch({ q: '沙丘2' })
    expect(results.length).toBe(1)
    expect(results[0].provider).toBe('aliyun')
    expect(results[0].url).toContain('alipan.com/s/abcdefghijk')
    expect(results[0].password).toBe('abcd')
  })

  it('searches 115 archive and filters 115 links', async () => {
    const mockHtml = `
      <div>
        <p>阿凡达2 4K 115网盘离线：https://115.com/s/sw34567890 提取码：5678 蓝光原盘</p>
      </div>
    `
    vi.stubGlobal('fetch', vi.fn(async () => new Response(mockHtml, { status: 200 })))

    const adapter = new Pan115ArchiveAdapter()
    const results = await adapter.executeSearch({ q: '阿凡达2' })
    expect(results.length).toBe(1)
    expect(results[0].provider).toBe('115')
    expect(results[0].url).toContain('115.com/s/sw34567890')
    expect(results[0].password).toBe('5678')
  })

  it('searches MagnetIndex via SolidTorrents gateway and parses magnets', async () => {
    const mockJson = {
      results: [
        {
          title: 'Ubuntu 24.04 LTS Desktop amd64',
          infohash: '1234567890abcdef1234567890abcdef12345678',
          magnet: 'magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678&dn=ubuntu',
          size: 6147483648,
          swarm: { seeders: 500, leechers: 20 }
        }
      ]
    }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockJson), { status: 200 })))

    const adapter = new MagnetIndexAdapter()
    const results = await adapter.executeSearch({ q: 'Ubuntu' })
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Ubuntu 24.04 LTS Desktop amd64')
    expect(results[0].infohash).toBe('1234567890abcdef1234567890abcdef12345678')
    expect(results[0].resourceType).toBe('magnet')
    expect(results[0].metadata?.seeders).toBe(500)
  })
})
