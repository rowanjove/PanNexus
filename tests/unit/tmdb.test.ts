import { describe, it, expect } from 'vitest'
import { resolveCanonicalMetadata } from '../../server/core/canonical/tmdb'

describe('Canonical Authority Metadata Engine (TMDB / AniList / OpenLib)', () => {
  it('resolves Chinese movie title to standard TMDB canonical entity', async () => {
    const meta = await resolveCanonicalMetadata('流浪地球2 4K REMUX')
    expect(meta).not.toBeNull()
    expect(meta?.canonicalId).toBe('tmdb:movie:842675')
    expect(meta?.standardTitle).toBe('流浪地球2')
    expect(meta?.year).toBe(2023)
  })

  it('resolves English alias to same canonical entity', async () => {
    const meta = await resolveCanonicalMetadata('The Wandering Earth II 2023')
    expect(meta).not.toBeNull()
    expect(meta?.canonicalId).toBe('tmdb:movie:842675')
  })

  it('resolves anime title to AniList canonical ID', async () => {
    const meta = await resolveCanonicalMetadata('SPY×FAMILY S02 1080p')
    expect(meta).not.toBeNull()
    expect(meta?.canonicalId).toBe('anilist:anime:140960')
    expect(meta?.category).toBe('anime')
  })

  it('resolves book title to OpenLibrary canonical ID', async () => {
    const meta = await resolveCanonicalMetadata('深入理解计算机系统 CSAPP 第三版')
    expect(meta).not.toBeNull()
    expect(meta?.canonicalId).toBe('openlib:book:OL25952219M')
    expect(meta?.category).toBe('book')
  })

  it('returns null for completely unrecognized title without throwing', async () => {
    const meta = await resolveCanonicalMetadata('一些完全不存在的未知自定义资源测试名xyz')
    expect(meta).toBeNull()
  })
})
