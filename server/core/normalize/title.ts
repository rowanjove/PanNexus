import crypto from 'node:crypto'

export interface ParsedMetadata {
  title: string
  normalizedTitle: string
  year?: number
  season?: number
  episode?: number
  resolution?: string
  codec?: string
  audio?: string
  edition?: string
  hdr?: string
  category?: 'movie' | 'tv' | 'anime' | 'music' | 'software' | 'game' | 'book' | 'other'
  cleanKey: string
}

const RESOLUTION_REGEX = /\b(4320p|2160p|1080p|1080i|720p|576p|480p|8k|4k|2k|uhd|fhd|hd)\b/i
const CODEC_REGEX = /\b(x264|x265|h264|h265|hevc|avc|av1|xvid|divx|vc-?1|10bit)\b/i
const AUDIO_REGEX = /\b(dts-?hd(\.ma)?|truehd|atmos|dts|ddp|eac3|ac3|aac|flac|mp3|lossless|5\.1|7\.1)\b/i
const EDITION_REGEX = /\b(remux|bluray|blu-ray|web-?dl|webrip|hdtv|bdrip|dvdrip|extended|director's\.cut|imax|criterion)\b/i
const HDR_REGEX = /\b(hdr10\+|hdr10|hdr|dolby\.vision|dovi|dv)\b/i
const YEAR_REGEX = /\b(19\d{2}|20\d{2})\b/
const SEASON_EPISODE_REGEX = /\b[sS](\d{1,2})[eE](\d{1,3})\b/i
const SEASON_ONLY_REGEX = /\b[sS](\d{1,2})\b/i
const EPISODE_ONLY_REGEX = /\b[eE](\d{1,3})\b/i

/**
 * Normalizes title by removing noise, brackets, separators and extracting structured metadata.
 */
export function parseTitleMetadata(rawTitle: string): ParsedMetadata {
  let text = rawTitle.trim()

  // Replace separators like dots, underscores, brackets with spaces
  let cleaned = text
    .replace(/[\[\]\(\)\{\}_+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extract Season & Episode
  let season: number | undefined
  let episode: number | undefined
  const seMatch = text.match(SEASON_EPISODE_REGEX)
  if (seMatch) {
    season = parseInt(seMatch[1], 10)
    episode = parseInt(seMatch[2], 10)
  } else {
    const sMatch = text.match(SEASON_ONLY_REGEX)
    if (sMatch) season = parseInt(sMatch[1], 10)
    const eMatch = text.match(EPISODE_ONLY_REGEX)
    if (eMatch) episode = parseInt(eMatch[1], 10)
  }

  // Extract Year
  let year: number | undefined
  const yearMatch = cleaned.match(YEAR_REGEX)
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10)
    if (y >= 1900 && y <= 2099) {
      year = y
    }
  }

  // Extract Resolution
  let resolution: string | undefined
  const resMatch = cleaned.match(RESOLUTION_REGEX)
  if (resMatch) {
    const r = resMatch[1].toLowerCase()
    if (r === '4k' || r === 'uhd' || r === '2160p') resolution = '2160p'
    else if (r === '8k' || r === '4320p') resolution = '4320p'
    else if (r === '1080p' || r === 'fhd') resolution = '1080p'
    else if (r === '720p' || r === 'hd') resolution = '720p'
    else resolution = r
  }

  // Extract Codec
  let codec: string | undefined
  const codecMatch = cleaned.match(CODEC_REGEX)
  if (codecMatch) {
    const c = codecMatch[1].toLowerCase()
    if (c === 'x265' || c === 'h265' || c === 'hevc') codec = 'HEVC'
    else if (c === 'x264' || c === 'h264' || c === 'avc') codec = 'AVC'
    else codec = c.toUpperCase()
  }

  // Extract Edition (Check REMUX first as it has highest specificity)
  let edition: string | undefined
  if (/\bremux\b/i.test(cleaned)) {
    edition = 'REMUX'
  } else if (/\bimax\b/i.test(cleaned)) {
    edition = 'IMAX'
  } else {
    const editionMatch = cleaned.match(EDITION_REGEX)
    if (editionMatch) {
      const ed = editionMatch[1].toLowerCase()
      if (ed.includes('bluray') || ed.includes('blu-ray')) edition = 'BluRay'
      else if (ed.includes('web-dl') || ed.includes('webdl')) edition = 'WEB-DL'
      else if (ed.includes('webrip')) edition = 'WEBRip'
      else edition = ed.toUpperCase()
    }
  }

  // Extract Audio
  let audio: string | undefined
  const audioMatch = cleaned.match(AUDIO_REGEX)
  if (audioMatch) {
    audio = audioMatch[1].toUpperCase()
  }

  // Extract HDR
  let hdr: string | undefined
  const hdrMatch = cleaned.match(HDR_REGEX)
  if (hdrMatch) {
    const h = hdrMatch[1].toLowerCase()
    if (h.includes('dovi') || h.includes('vision') || h === 'dv') hdr = 'DV'
    else if (h.includes('hdr10+')) hdr = 'HDR10+'
    else hdr = 'HDR'
  }

  // Category inference: prioritize distinctive format keywords
  let category: ParsedMetadata['category'] = 'other'
  if (/\b(v\d+(\.\d+)+|setup|installer|keygen|crack|portable|x64|x86|repack)\b/i.test(rawTitle)) {
    category = 'software'
  } else if (/\b(epub|pdf|mobi|azw3)\b/i.test(rawTitle)) {
    category = 'book'
  } else if (/\b(flac|ape|wav|mp3|320k|lossless)\b/i.test(rawTitle)) {
    category = 'music'
  } else if (season !== undefined || episode !== undefined) {
    category = 'tv'
  } else if (resolution || edition || year) {
    category = 'movie'
  }

  // Generate cleaned human title (strip technical flags and release tags)
  let cleanTitle = rawTitle
    .replace(new RegExp(`\\b${year}\\b`, 'g'), '')
    .replace(RESOLUTION_REGEX, '')
    .replace(CODEC_REGEX, '')
    .replace(AUDIO_REGEX, '')
    .replace(EDITION_REGEX, '')
    .replace(HDR_REGEX, '')
    .replace(SEASON_EPISODE_REGEX, '')
    .replace(/[\[\]\(\)\{\}_+.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanTitle) cleanTitle = rawTitle.trim()

  const normalizedTitle = cleanTitle.toLowerCase()

  // Clean composite key for Canonical grouping
  const keyBase = [
    normalizedTitle.replace(/\s+/g, ''),
    year || '',
    resolution || '',
    edition || ''
  ].join('_')

  const cleanKey = crypto.createHash('sha256').update(keyBase).digest('hex').slice(0, 16)

  return {
    title: cleanTitle,
    normalizedTitle,
    year,
    season,
    episode,
    resolution,
    codec,
    audio,
    edition,
    hdr,
    category,
    cleanKey
  }
}
