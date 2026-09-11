import { describe, it, expect } from 'vitest'
import { parseTitleMetadata } from '../../server/core/normalize/title'

describe('Title & Metadata Normalizer', () => {
  it('correctly extracts movie year, resolution, codec, and edition', () => {
    const raw = 'The.Wandering.Earth.II.2023.2160p.UHD.BluRay.REMUX.HEVC.DV.TrueHD.7.1.Atmos-HDChina'
    const result = parseTitleMetadata(raw)

    expect(result.year).toBe(2023)
    expect(result.resolution).toBe('2160p')
    expect(result.codec).toBe('HEVC')
    expect(result.edition).toBe('REMUX')
    expect(result.hdr).toBe('DV')
    expect(result.category).toBe('movie')
    expect(result.cleanKey).toBeDefined()
  })

  it('correctly extracts TV series season and episode', () => {
    const raw = 'Blossoms.Shanghai.2023.S01E08.4K.WEB-DL.H265.AAC'
    const result = parseTitleMetadata(raw)

    expect(result.year).toBe(2023)
    expect(result.season).toBe(1)
    expect(result.episode).toBe(8)
    expect(result.category).toBe('tv')
    expect(result.resolution).toBe('2160p')
  })

  it('detects software category', () => {
    const raw = 'Adobe.Photoshop.2024.v25.11.x64.Portable.Setup'
    const result = parseTitleMetadata(raw)

    expect(result.category).toBe('software')
  })
})
