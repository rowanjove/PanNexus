import { describe, it, expect } from 'vitest'
import { extractPanResourcesFromText, extractCleanTitle } from '../../server/core/dedup/pan-extractor'

describe('Netdisk & Password Extractor', () => {
  it('extracts Baidu netdisk url and password from text', () => {
    const text = `
    【最新电影】沙丘2 4K 杜比视界 DUNE 2
    百度网盘：https://pan.baidu.com/s/1abcdefg123456 提取码: 8888
    失效请反馈，更多资源请关注公众号
    `
    const items = extractPanResourcesFromText(text)
    expect(items).toHaveLength(1)
    expect(items[0].provider).toBe('baidu')
    expect(items[0].resourceType).toBe('cloud_drive')
    expect(items[0].url).toBe('https://pan.baidu.com/s/1abcdefg123456')
    expect(items[0].password).toBe('8888')
    expect(items[0].title).toContain('沙丘2')
  })

  it('extracts Quark and Alipan links with multiple providers in one message', () => {
    const text = `
    奥本海默 Oppenheimer 2023 2160p REMUX
    夸克：https://pan.quark.cn/s/qk998877 密码：k666
    阿里：https://www.alipan.com/s/ali554433 (免密)
    `
    const items = extractPanResourcesFromText(text)
    expect(items).toHaveLength(2)

    const quark = items.find(i => i.provider === 'quark')
    expect(quark).toBeDefined()
    expect(quark!.password).toBe('k666')

    const aliyun = items.find(i => i.provider === 'aliyun')
    expect(aliyun).toBeDefined()
    expect(aliyun!.password).toBeUndefined()
  })

  it('extracts 123pan, Pikpak, and ed2k links', () => {
    const text = `
    测试资源合集
    123盘: https://www.123pan.com/s/abc-1234?pwd=7788
    PikPak: https://mypikpak.com/s/xyz9876
    电驴: ed2k://|file|sample.mkv|104857600|abcdef0123456789abcdef0123456789|/
    `
    const items = extractPanResourcesFromText(text)
    expect(items).toHaveLength(3)

    const pan123 = items.find(i => i.provider === '123pan')
    expect(pan123).toBeDefined()
    expect(pan123!.password).toBe('7788')

    const pikpak = items.find(i => i.provider === 'pikpak')
    expect(pikpak).toBeDefined()

    const ed2k = items.find(i => i.provider === 'ed2k')
    expect(ed2k).toBeDefined()
    expect(ed2k!.resourceType).toBe('ed2k')
  })

  it('extracts 115 and Magnet links', () => {
    const text = `
    流浪地球2 4K IMAX
    115网盘: https://115.com/s/sw35w3456?password=vip1
    磁力: magnet:?xt=urn:btih:e3b0c44298fc1c149afbf4c8996fb92427ae41e4
    `
    const items = extractPanResourcesFromText(text)
    expect(items).toHaveLength(2)

    const p115 = items.find(i => i.provider === '115')
    expect(p115!.password).toBe('vip1')

    const mag = items.find(i => i.provider === 'magnet')
    expect(mag!.infohash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4')
  })

  it('filters promotional text in title extraction', () => {
    const title = extractCleanTitle(`
    更多资源请关注备用发布页
    #电视剧 繁花 2023 4K 沪语中字
    https://pan.quark.cn/s/1234
    `)
    expect(title).toBe('繁花 2023 4K 沪语中字')
  })

  it('returns empty array when no links found', () => {
    expect(extractPanResourcesFromText('这是一条纯讨论消息，没有任何分享链接')).toEqual([])
  })
})
