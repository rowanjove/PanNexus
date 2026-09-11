import { describe, it, expect } from 'vitest'
import { parseTorznabXml, TorznabAdapter } from '../../server/sources/implementations/torznab.adapter'

describe('Torznab Protocol Parser & Adapter', () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <channel>
    <title>Jackett Torznab Feed</title>
    <item>
      <title><![CDATA[Dune.Part.Two.2024.2160p.UHD.BluRay.x265]]></title>
      <link>magnet:?xt=urn:btih:3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e&amp;dn=Dune.Part.Two</link>
      <enclosure url="https://indexer.example/dl/123.torrent" length="65000000000" type="application/x-bittorrent" />
      <size>65000000000</size>
      <pubDate>Mon, 08 Apr 2024 12:00:00 +0000</pubDate>
      <torznab:attr name="infohash" value="3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e" />
      <torznab:attr name="seeders" value="150" />
      <torznab:attr name="peers" value="25" />
    </item>
  </channel>
</rss>`

  it('parses Torznab XML feed with enclosure, infohash, and seeders', () => {
    const items = parseTorznabXml(sampleXml)
    expect(items.length).toBe(1)
    expect(items[0].title).toBe('Dune.Part.Two.2024.2160p.UHD.BluRay.x265')
    expect(items[0].infohash).toBe('3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e')
    expect(items[0].sizeBytes).toBe(65000000000)
    expect(items[0].seeders).toBe(150)
    expect(items[0].peers).toBe(25)
  })

  it('executes search with circuit breaker safety', async () => {
    const adapter = new TorznabAdapter()
    const results = await adapter.executeSearch({ q: '沙丘2' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].resourceType).toBe('magnet')
    expect(results[0].metadata?.gateway).toBe('Torznab/Jackett')
  })
})
