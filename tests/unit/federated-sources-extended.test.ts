import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AcademicTorrentsAdapter } from '../../server/sources/implementations/academic-torrents.adapter'
import { EbookAdapter } from '../../server/sources/implementations/ebook.adapter'
import { SoftwareAdapter } from '../../server/sources/implementations/software.adapter'
import { QuPanSouAdapter } from '../../server/sources/implementations/qupansou.adapter'
import { COMMUNITY_TG_CHANNELS } from '../../server/sources/implementations/tg-generic.adapter'

const mockAcademicRss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:torrent="https://academictorrents.com">
  <channel>
    <title>Academic Torrents</title>
    <item>
      <title>Llama 3 8B Instruct Model Weights</title>
      <link>https://academictorrents.com/details/abcd1234abcd1234abcd1234abcd1234abcd1234</link>
      <enclosure url="https://academictorrents.com/download/abcd1234abcd1234abcd1234abcd1234abcd1234.torrent" length="8589934592" type="application/x-bittorrent" />
      <pubDate>Mon, 10 Sep 2026 12:00:00 GMT</pubDate>
      <description>Meta AI Llama 3 8B instruct weights</description>
    </item>
  </channel>
</rss>`

const mockOpenLibraryJson = {
  docs: [
    {
      key: '/works/OL1000W',
      title: 'Structure and Interpretation of Computer Programs',
      author_name: ['Harold Abelson', 'Gerald Jay Sussman'],
      first_publish_year: 1985,
      isbn: ['9780262010771']
    }
  ]
}

const mockGitHubJson = {
  items: [
    {
      id: 12345,
      name: 'vibe-player',
      full_name: 'vibe/vibe-player',
      html_url: 'https://github.com/vibe/vibe-player',
      description: 'Ultra-fast media player',
      stargazers_count: 8800,
      language: 'Rust',
      updated_at: '2026-09-01T00:00:00Z'
    }
  ]
}

const mockQuPanSouHtml = `
<html>
  <body>
    <div class="result-item">
      <h3>流浪地球2 4K 夸克网盘分享</h3>
      <p>夸克链接：https://pan.quark.cn/s/abcdef123456 提取码：abcd 欢迎下载</p>
    </div>
  </body>
</html>
`

describe('Extended Federated Sources Adapters', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('verifies expanded Telegram channels cover all major domestic cloud disks', () => {
    expect(COMMUNITY_TG_CHANNELS.length).toBeGreaterThanOrEqual(18)
    const usernames = COMMUNITY_TG_CHANNELS.map(c => c.channelUsername)

    // Tianyi, 123, 139, UC, Anime, 115, Xunlei
    expect(usernames).toContain('tianyifc')
    expect(usernames).toContain('yp123pan')
    expect(usernames).toContain('yunpan139')
    expect(usernames).toContain('yunpanuc')
    expect(usernames).toContain('Q_dongman')
    expect(usernames).toContain('Lsp115')
    expect(usernames).toContain('XunLeiPinDao')
    expect(usernames).toContain('tgsearchers6')

    const animeChannel = COMMUNITY_TG_CHANNELS.find(c => c.channelUsername === 'Q_dongman')
    expect(animeChannel?.defaultCategory).toBe('anime')
  })

  it('searches Academic Torrents and maps RSS enclosure & metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(mockAcademicRss, { status: 200 })))
    const adapter = new AcademicTorrentsAdapter()

    const results = await adapter.executeSearch({ q: 'Llama 3' })
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Llama 3 8B Instruct Model Weights')
    expect(results[0].url).toContain('academictorrents.com/download/')
    expect(results[0].metadata?.pageUrl).toContain('academictorrents.com/details/')
    expect(results[0].metadata?.source).toBe('academic_torrents')
  })

  it('searches Open Library and maps book metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockOpenLibraryJson), { status: 200 })))
    const adapter = new EbookAdapter()

    const results = await adapter.executeSearch({ q: 'SICP' })
    expect(results.length).toBe(1)
    expect(results[0].title).toContain('Structure and Interpretation of Computer Programs')
    expect(results[0].title).toContain('Harold Abelson')
    expect(results[0].resourceType).toBe('doc')
    expect(results[0].metadata?.source).toBe('openlibrary')
  })

  it('searches GitHub software releases and maps repository data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockGitHubJson), { status: 200 })))
    const adapter = new SoftwareAdapter()

    const results = await adapter.executeSearch({ q: 'vibe-player' })
    expect(results.length).toBe(1)
    expect(results[0].title).toContain('vibe/vibe-player')
    expect(results[0].title).toContain('★8800')
    expect(results[0].url).toBe('https://github.com/vibe/vibe-player/releases')
    expect(results[0].resourceType).toBe('software')
    expect(results[0].metadata?.source).toBe('github')
  })

  it('searches QuPanSou and extracts cloud disk URLs and passwords', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(mockQuPanSouHtml, { status: 200, headers: { 'content-type': 'text/html' } })))
    const adapter = new QuPanSouAdapter()

    const results = await adapter.executeSearch({ q: '流浪地球2' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].provider).toBe('quark')
    expect(results[0].url).toContain('pan.quark.cn/s/abcdef123456')
    expect(results[0].password).toBe('abcd')
  })
})
