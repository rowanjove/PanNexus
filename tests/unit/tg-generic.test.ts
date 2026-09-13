import { describe, it, expect, vi } from 'vitest'
import { parseTelegramWebHtml, TelegramGenericAdapter } from '../../server/sources/implementations/tg-generic.adapter'

describe('Telegram Generic Channel Adapter', () => {
  const sampleHtml = `
    <div class="tgme_widget_message_wrap">
      <div class="tgme_widget_message_text js-message_text" dir="auto">
        奥本海默 4K 原盘 REMUX 杜比视界<br/>
        https://pan.quark.cn/s/qk_oppenheimer_4k<br/>
        提取码: meta
      </div>
    </div>
  `

  it('extracts cloud drive url and password from telegram web html', () => {
    const parsed = parseTelegramWebHtml(sampleHtml)
    expect(parsed.length).toBe(1)
    expect(parsed[0].url).toBe('https://pan.quark.cn/s/qk_oppenheimer_4k')
    expect(parsed[0].password).toBe('meta')
    expect(parsed[0].text).toContain('奥本海默')
  })

  it('instantiates generic channel adapter with custom config', async () => {
    const adapter = new TelegramGenericAdapter({
      channelUsername: 'Aliyun_4K_Movies',
      channelName: '阿里 4K 影视频道',
      defaultCategory: 'movie',
      priority: 85
    })

    expect(adapter.id).toBe('tg_aliyun_4k_movies')
    expect(adapter.name).toBe('阿里 4K 影视频道')
    expect(adapter.priority).toBe(85)

    vi.stubGlobal('fetch', vi.fn(async () => new Response(`
      <div class="tgme_widget_message_text js-message_text">
        星际穿越 4K IMAX<br/>https://pan.quark.cn/s/qk_interstellar_4k
      </div>
    `, { status: 200 })))
    try {
      const results = await adapter.executeSearch({ q: '星际穿越' })
      expect(results.length).toBe(1)
      expect(results[0].metadata?.channel).toBe('Aliyun_4K_Movies')
      expect(results[0].metadata?.category).toBe('movie')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
