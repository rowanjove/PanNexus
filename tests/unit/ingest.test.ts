import { describe, it, expect } from 'vitest'
import { ingestRawResources } from '../../server/core/ingest'
import { MemoryIngestStore } from '../../server/core/ingest/store'
import { isResourceBlocked } from '../../server/core/ingest/blocked'

describe('Resource ingest upsert & governance', () => {
  it('inserts a new resource and updates on url_hash collision', async () => {
    const store = new MemoryIngestStore(['nyaa_global'])
    const first = await ingestRawResources([{
      title: 'Demo Movie 2024 1080p',
      url: 'https://nyaa.si/view/1',
      resourceType: 'magnet',
      provider: 'magnet',
      infohash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }], store, { sourceKey: 'nyaa_global' })

    expect(first.inserted).toBe(1)
    expect(store.resources.length).toBe(1)

    const second = await ingestRawResources([{
      title: 'Demo Movie 2024 1080p UPDATED',
      url: 'https://nyaa.si/view/1',
      resourceType: 'magnet',
      provider: 'magnet',
      infohash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }], store, { sourceKey: 'nyaa_global' })

    expect(second.updated).toBe(1)
    expect(second.inserted).toBe(0)
    expect(store.resources.length).toBe(1)
    expect(store.resources[0].title).toContain('UPDATED')
  })

  it('deduplicates by infohash even when URLs differ', async () => {
    const store = new MemoryIngestStore()
    const hash = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    await ingestRawResources([{
      title: 'Same torrent via magnet',
      url: `magnet:?xt=urn:btih:${hash}&dn=a`,
      infohash: hash
    }], store)
    await ingestRawResources([{
      title: 'Same torrent via page',
      url: 'https://nyaa.si/view/99',
      infohash: hash
    }], store)
    expect(store.resources.length).toBe(1)
  })

  it('skips blocked keywords and writes file lists', async () => {
    const store = new MemoryIngestStore()
    store.blocked.push({ type: 'keyword', value: 'spamware' })

    const result = await ingestRawResources([
      {
        title: 'Totally Spamware Pack',
        url: 'https://example.com/s/spam'
      },
      {
        title: 'Legit Book PDF',
        url: 'https://pan.quark.cn/s/legitbook',
        files: [{ filename: 'book.pdf', extension: 'pdf', sizeBytes: 12 }]
      }
    ], store)

    expect(result.skipped).toBe(1)
    expect(result.inserted).toBe(1)
    expect(store.files.get(store.resources[0].id)?.[0].filename).toBe('book.pdf')
  })

  it('isResourceBlocked matches domain, keyword and infohash', () => {
    const blocked = [
      { type: 'keyword', value: 'GTA6 破解' },
      { type: 'domain', value: 'malware.test' },
      { type: 'infohash', value: 'cccccccccccccccccccccccccccccccccccccccc' }
    ]
    expect(isResourceBlocked({ title: 'GTA6 破解版' }, blocked)).toBe(true)
    expect(isResourceBlocked({ url: 'https://malware.test/a' }, blocked)).toBe(true)
    expect(isResourceBlocked({ infohash: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' }, blocked)).toBe(true)
    expect(isResourceBlocked({ title: '流浪地球2' }, blocked)).toBe(false)
  })
})
