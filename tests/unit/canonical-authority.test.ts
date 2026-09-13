import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  resolveAniListMetadata,
  resolveMusicBrainzMetadata,
  resolveCanonicalMetadata
} from '../../server/core/canonical/tmdb'

const mockAniListJson = {
  data: {
    Media: {
      id: 140960,
      title: {
        romaji: 'SPY×FAMILY',
        english: 'SPY x FAMILY',
        native: 'SPY×FAMILY'
      },
      startDate: { year: 2022 },
      coverImage: {
        large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx140960-Y0rP8i9L4qYy.png'
      }
    }
  }
}

const mockMusicBrainzJson = {
  'release-groups': [
    {
      id: 'd962040b-74b8-439f-a2e6-c183cfdc6d91',
      title: 'Abbey Road',
      'first-release-date': '1969-09-26',
      'artist-credit': [
        {
          name: 'The Beatles'
        }
      ]
    }
  ]
}

describe('Canonical Authority Resolvers (AniList & MusicBrainz)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves Anime metadata via AniList GraphQL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockAniListJson), { status: 200 })))

    const anime = await resolveAniListMetadata('SPY x FAMILY')
    expect(anime).not.toBeNull()
    expect(anime?.canonicalId).toBe('anilist:anime:140960')
    expect(anime?.standardTitle).toBe('SPY×FAMILY')
    expect(anime?.category).toBe('anime')
    expect(anime?.year).toBe(2022)
    expect(anime?.posterUrl).toContain('bx140960')
  })

  it('resolves Music release group metadata via MusicBrainz REST', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockMusicBrainzJson), { status: 200 })))

    const music = await resolveMusicBrainzMetadata('Abbey Road')
    expect(music).not.toBeNull()
    expect(music?.canonicalId).toContain('musicbrainz:release-group:')
    expect(music?.standardTitle).toBe('Abbey Road')
    expect(music?.originalTitle).toContain('The Beatles')
    expect(music?.year).toBe(1969)
  })

  it('cascades from built-in dict to AniList / MusicBrainz when offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockAniListJson), { status: 200 })))

    // Unknown title that falls back to AniList
    const result = await resolveCanonicalMetadata('New Anime 2026')
    expect(result).not.toBeNull()
    expect(result?.canonicalId).toBe('anilist:anime:140960')
  })
})
