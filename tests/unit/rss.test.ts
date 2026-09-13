import { describe, it, expect } from 'vitest'
import { parseRssXml, parseSizeToBytes, rssItemToRawResource } from '../../server/core/rss/parse'

describe('RSS parser', () => {
  const nyaaXml = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:nyaa="https://nyaa.si/xmlns/nyaa" version="2.0">
  <channel>
    <item>
      <title>[SubsPlease] Spy x Family - 01 (1080p)</title>
      <link>https://nyaa.si/view/123</link>
      <pubDate>Sat, 11 Jan 2025 00:00:00 -0000</pubDate>
      <nyaa:seeders>42</nyaa:seeders>
      <nyaa:leechers>3</nyaa:leechers>
      <nyaa:infoHash>ABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD</nyaa:infoHash>
      <nyaa:size>1.4 GiB</nyaa:size>
      <enclosure url="https://nyaa.si/download/123.torrent" length="1503238553" type="application/x-bittorrent" />
    </item>
  </channel>
</rss>`

  const dmhyXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>DMHY RSS</title>
    <item>
      <title><![CDATA[【动漫国字幕组】★01月新番[我推的孩子 第二季][12-24][1080P][简繁外挂][MP4/MKV]]]></title>
      <link>https://share.dmhy.org/topics/view/67890_Oshi_no_Ko.html</link>
      <pubDate>Mon, 13 Jan 2025 12:00:00 +0800</pubDate>
      <description><![CDATA[<p>动漫国字幕组发布</p>]]></description>
      <enclosure url="magnet:?xt=urn:btih:11223344556677889900aabbccddeeff11223344&amp;dn=Oshi+no+Ko" length="0" type="application/x-bittorrent" />
    </item>
  </channel>
</rss>`

  it('parses Nyaa RSS fields including infohash and size', () => {
    const items = parseRssXml(nyaaXml)
    expect(items).toHaveLength(1)
    expect(items[0].title).toContain('Spy x Family')
    expect(items[0].infohash).toBe('abcdefabcdefabcdefabcdefabcdefabcdefabcd')
    expect(items[0].seeders).toBe(42)
  })

  it('parses DMHY RSS fields with CDATA and magnet enclosure', () => {
    const items = parseRssXml(dmhyXml)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('【动漫国字幕组】★01月新番[我推的孩子 第二季][12-24][1080P][简繁外挂][MP4/MKV]')
    expect(items[0].enclosureUrl).toBe('magnet:?xt=urn:btih:11223344556677889900aabbccddeeff11223344&dn=Oshi+no+Ko')

    const raw = rssItemToRawResource(items[0], { source: 'dmhy' })
    expect(raw).not.toBeNull()
    expect(raw!.infohash).toBe('11223344556677889900aabbccddeeff11223344')
    expect(raw!.provider).toBe('magnet')
    expect(raw!.resourceType).toBe('magnet')
    expect(raw!.metadata?.source).toBe('dmhy')
  })

  it('converts RSS item to magnet RawResource', () => {
    const [item] = parseRssXml(nyaaXml)
    const raw = rssItemToRawResource(item, { source: 'nyaa' })
    expect(raw).not.toBeNull()
    expect(raw!.infohash).toHaveLength(40)
    expect(raw!.url?.startsWith('magnet:?')).toBe(true)
    expect(raw!.resourceType).toBe('magnet')
    expect(raw!.metadata?.source).toBe('nyaa')
  })

  it('parses human-readable sizes', () => {
    expect(parseSizeToBytes('1.4 GiB')).toBe(Math.round(1.4 * 1024 ** 3))
    expect(parseSizeToBytes('500 MB')).toBe(500 * 1024 ** 2)
    expect(parseSizeToBytes('2.5 TB')).toBe(Math.round(2.5 * 1024 ** 4))
    expect(parseSizeToBytes('65000000000')).toBe(65000000000)
    expect(parseSizeToBytes('')).toBeUndefined()
    expect(parseSizeToBytes('invalid')).toBeUndefined()
  })

  it('handles empty or malformed XML gracefully', () => {
    expect(parseRssXml('')).toEqual([])
    expect(parseRssXml('<html>not rss</html>')).toEqual([])
    expect(parseRssXml('<rss><channel><item><link>no title</link></item></channel></rss>')).toEqual([])
  })
})
