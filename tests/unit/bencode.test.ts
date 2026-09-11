import { describe, it, expect } from 'vitest'
import { BencodeDecoder, parseTorrent } from '../../server/core/torrent/bencode'

describe('Bencode Decoder & Torrent Parser', () => {
  it('decodes bencoded integers, strings, lists, and dicts', () => {
    // Integer
    const intDec = new BencodeDecoder(new TextEncoder().encode('i12345e'))
    expect(intDec.decode()).toBe(12345)

    // String
    const strDec = new BencodeDecoder(new TextEncoder().encode('5:hello'))
    expect(strDec.decode()).toBe('hello')

    // List
    const listDec = new BencodeDecoder(new TextEncoder().encode('l4:spami42ee'))
    expect(listDec.decode()).toEqual(['spam', 42])

    // Dictionary
    const dictDec = new BencodeDecoder(new TextEncoder().encode('d3:bar4:spam3:fooi42ee'))
    expect(dictDec.decode()).toEqual({ bar: 'spam', foo: 42 })
  })

  it('parses simulated torrent buffer extracting files, infohash, and magnet URI', () => {
    // Synthetic bencoded torrent
    const torrentStr = 'd8:announce27:http://tracker.com/announce4:infod6:lengthi1048576e4:name13:test_file.mkvee'
    const buffer = new TextEncoder().encode(torrentStr)

    const parsed = parseTorrent(buffer)

    expect(parsed.name).toBe('test_file.mkv')
    expect(parsed.totalSizeBytes).toBe(1048576)
    expect(parsed.infohash).toBeDefined()
    expect(parsed.infohash.length).toBe(40)
    expect(parsed.magnetUri).toContain('urn:btih:')
    expect(parsed.files.length).toBe(1)
    expect(parsed.files[0].filename).toBe('test_file.mkv')
  })
})
