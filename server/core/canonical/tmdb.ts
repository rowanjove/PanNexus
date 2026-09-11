import type { H3Event } from 'h3'

export interface CanonicalMetadata {
  canonicalId: string
  standardTitle: string
  originalTitle?: string
  category: 'movie' | 'tv' | 'anime' | 'book' | 'software' | 'game' | 'other'
  year?: number
  backdropUrl?: string
  posterUrl?: string
  aliases: string[]
}

// Built-in high-confidence Canonical entity dictionary (fallback when offline / no TMDB API key)
const KNOWN_CANONICAL_ENTITIES: CanonicalMetadata[] = [
  {
    canonicalId: 'tmdb:movie:842675',
    standardTitle: '流浪地球2',
    originalTitle: 'The Wandering Earth II',
    category: 'movie',
    year: 2023,
    aliases: ['流浪地球 2', 'the wandering earth 2', 'the wandering earth ii', 'wandering earth 2']
  },
  {
    canonicalId: 'tmdb:movie:872585',
    standardTitle: '奥本海默',
    originalTitle: 'Oppenheimer',
    category: 'movie',
    year: 2023,
    aliases: ['oppenheimer', '奥本海默 2023']
  },
  {
    canonicalId: 'tmdb:movie:157336',
    standardTitle: '星际穿越',
    originalTitle: 'Interstellar',
    category: 'movie',
    year: 2014,
    aliases: ['interstellar', '星际穿越 imax']
  },
  {
    canonicalId: 'tmdb:movie:693134',
    standardTitle: '沙丘2',
    originalTitle: 'Dune: Part Two',
    category: 'movie',
    year: 2024,
    aliases: ['沙丘 2', 'dune part two', 'dune 2', 'dune: part two']
  },
  {
    canonicalId: 'tmdb:movie:278',
    standardTitle: '肖申克的救赎',
    originalTitle: 'The Shawshank Redemption',
    category: 'movie',
    year: 1994,
    aliases: ['the shawshank redemption', '月黑高飞', '地狱诺言']
  },
  {
    canonicalId: 'anilist:anime:140960',
    standardTitle: '间谍过家家',
    originalTitle: 'SPY×FAMILY',
    category: 'anime',
    year: 2022,
    aliases: ['spy x family', 'spy family', '间谍过家家 第二季', 'spy family s2']
  },
  {
    canonicalId: 'anilist:anime:16498',
    standardTitle: '进击的巨人',
    originalTitle: 'Shingeki no Kyojin',
    category: 'anime',
    year: 2013,
    aliases: ['attack on titan', 'shingeki no kyojin', '进击的巨人 最终季']
  },
  {
    canonicalId: 'tmdb:tv:1668',
    standardTitle: '老友记',
    originalTitle: 'Friends',
    category: 'tv',
    year: 1994,
    aliases: ['friends', '六人行', '老友记全集']
  },
  {
    canonicalId: 'openlib:book:OL25952219M',
    standardTitle: '深入理解计算机系统',
    originalTitle: "Computer Systems: A Programmer's Perspective",
    category: 'book',
    year: 2016,
    aliases: ['csapp', '深入理解计算机系统 第三版', '深入理解计算机系统 3rd']
  }
]

// In-memory cache for fast resolution
const memoryCanonicalCache = new Map<string, CanonicalMetadata | null>()

/**
 * Matches a query or raw title against canonical authority sources (TMDB / AniList).
 * Uses KV / In-memory caching and high-accuracy dictionary fallback.
 */
export async function resolveCanonicalMetadata(
  title: string,
  event?: H3Event
): Promise<CanonicalMetadata | null> {
  const normalized = title.trim().toLowerCase()
  if (!normalized) return null

  // 1. Check in-memory cache
  if (memoryCanonicalCache.has(normalized)) {
    return memoryCanonicalCache.get(normalized) || null
  }

  // 2. Check KV Cache if running on Cloudflare
  const cfEnv = (event?.context as any)?.cloudflare?.env
  if (cfEnv?.METASEEK_KV) {
    try {
      const cached = await cfEnv.METASEEK_KV.get(`canonical:${normalized}`, 'json')
      if (cached) {
        memoryCanonicalCache.set(normalized, cached)
        return cached
      }
    } catch {
      // Ignore KV error
    }
  }

  // 3. Match against built-in dictionary
  for (const entity of KNOWN_CANONICAL_ENTITIES) {
    if (
      normalized.includes(entity.standardTitle.toLowerCase()) ||
      (entity.originalTitle && normalized.includes(entity.originalTitle.toLowerCase())) ||
      entity.aliases.some(alias => normalized.includes(alias.toLowerCase()))
    ) {
      memoryCanonicalCache.set(normalized, entity)
      return entity
    }
  }

  // 4. If TMDB_API_KEY is available, perform real search
  const tmdbKey = cfEnv?.TMDB_API_KEY || (typeof process !== 'undefined' ? process.env?.TMDB_API_KEY : undefined)
  if (tmdbKey) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&api_key=${tmdbKey}&language=zh-CN`)
      if (res.ok) {
        const data = await res.json()
        const first = data?.results?.[0]
        if (first && (first.media_type === 'movie' || first.media_type === 'tv')) {
          const entity: CanonicalMetadata = {
            canonicalId: `tmdb:${first.media_type}:${first.id}`,
            standardTitle: first.title || first.name,
            originalTitle: first.original_title || first.original_name,
            category: first.media_type === 'movie' ? 'movie' : 'tv',
            year: first.release_date ? parseInt(first.release_date.slice(0, 4), 10) : undefined,
            posterUrl: first.poster_path ? `https://image.tmdb.org/t/p/w500${first.poster_path}` : undefined,
            aliases: []
          }

          // Cache for 7 days in KV if available
          if (cfEnv?.METASEEK_KV) {
            await cfEnv.METASEEK_KV.put(`canonical:${normalized}`, JSON.stringify(entity), { expirationTtl: 86400 * 7 })
          }

          memoryCanonicalCache.set(normalized, entity)
          return entity
        }
      }
    } catch {
      // Fallback
    }
  }

  memoryCanonicalCache.set(normalized, null)
  return null
}
