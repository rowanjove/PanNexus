import { describe, it, expect } from 'vitest'
import { normalizeUrl, calculateUrlHash, parseMagnetInfohash, inferProviderAndType } from '../../server/core/dedup/index'

describe('Deduplication & URL/Magnet Utilities', () => {
  it('strips tracking parameters and normalizes URL', () => {
    const raw1 = 'https://pan.quark.cn/s/abcdef123456?utm_source=telegram&ref=share#heading'
    const raw2 = 'https://pan.quark.cn/s/abcdef123456?spm=1001.2002'

    const clean1 = normalizeUrl(raw1)
    const clean2 = normalizeUrl(raw2)

    expect(clean1).toBe('https://pan.quark.cn/s/abcdef123456#heading')
    expect(clean2).toBe('https://pan.quark.cn/s/abcdef123456')
    expect(calculateUrlHash(clean1)).toBe(calculateUrlHash('https://pan.quark.cn/s/abcdef123456#heading'))
  })

  it('extracts standardized 40-char BTIH infohash from magnet link', () => {
    const magnet = 'magnet:?xt=urn:btih:E3B0C44298FC1C149AFBF4C8996FB92427AE41E4&dn=Test.File&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337'
    const parsed = parseMagnetInfohash(magnet)

    expect(parsed.infohash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4')
    expect(parsed.displayName).toBe('Test.File')
    expect(parsed.trackers).toContain('udp://tracker.opentrackr.org:1337')
  })

  it('correctly infers provider and resource type', () => {
    expect(inferProviderAndType('https://pan.baidu.com/s/1xyz')).toEqual({ provider: 'baidu', resourceType: 'cloud_drive' })
    expect(inferProviderAndType('https://pan.quark.cn/s/2abc')).toEqual({ provider: 'quark', resourceType: 'cloud_drive' })
    expect(inferProviderAndType('https://www.alipan.com/s/3def')).toEqual({ provider: 'aliyun', resourceType: 'cloud_drive' })
    expect(inferProviderAndType('https://115.com/s/4ghi')).toEqual({ provider: '115', resourceType: 'cloud_drive' })
    expect(inferProviderAndType('magnet:?xt=urn:btih:1234567890abcdef1234567890abcdef12345678')).toEqual({ provider: 'magnet', resourceType: 'magnet' })
    expect(inferProviderAndType('ed2k://|file|test.iso|1234|hash|/')).toEqual({ provider: 'ed2k', resourceType: 'ed2k' })
  })
})
