import { safeFetch } from '../http/safe-fetch'

const DOUBAN_HOT_URL = 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&page_limit=20&page_start=0'

const FALLBACK_HOT_MOVIES = [
  '流浪地球2',
  '奥本海默',
  '黑神话悟空',
  '沙丘2',
  '繁花',
  '星际穿越',
  '庆余年 第二季',
  '三体',
  '狂飙',
  '热辣滚烫',
  '飞驰人生2',
  '周处除三害'
]

export interface DoubanSubjectItem {
  id: string
  title: string
  rate?: string
  url?: string
  cover?: string
}

/**
 * Fetches real-time trending movie/series keywords from Douban.
 * Guards with safeFetch and falls back gracefully to a curated trending list.
 */
export async function fetchDoubanHotKeywords(limit = 10): Promise<string[]> {
  try {
    const res = await safeFetch(DOUBAN_HOT_URL, {
      timeoutMs: 6000,
      headers: {
        Referer: 'https://movie.douban.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!res.ok) {
      return FALLBACK_HOT_MOVIES.slice(0, limit)
    }

    const json = await res.json() as { subjects?: DoubanSubjectItem[] }
    if (Array.isArray(json?.subjects) && json.subjects.length > 0) {
      const titles = json.subjects
        .map(s => s.title?.trim())
        .filter((t): t is string => Boolean(t && t.length >= 2))

      if (titles.length > 0) {
        return titles.slice(0, limit)
      }
    }

    return FALLBACK_HOT_MOVIES.slice(0, limit)
  } catch {
    return FALLBACK_HOT_MOVIES.slice(0, limit)
  }
}
