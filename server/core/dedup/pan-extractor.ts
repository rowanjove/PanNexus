import type { ResourceType } from '~/shared/types'

export interface ExtractedResource {
  url: string
  provider: string
  resourceType: ResourceType
  password?: string
  title: string
  infohash?: string
}

interface ProviderRule {
  provider: string
  resourceType: ResourceType
  urlRegex: RegExp
  pwdParamRegex?: RegExp
}

const PROVIDER_RULES: ProviderRule[] = [
  {
    provider: 'baidu',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/pan\.baidu\.com\/(?:s\/[a-zA-Z0-9_-]+|share\/init\?surl=[a-zA-Z0-9_-]+)(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]pwd=([a-zA-Z0-9]{4})/i
  },
  {
    provider: 'quark',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/pan\.quark\.cn\/s\/[a-zA-Z0-9_-]+(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]pwd=([a-zA-Z0-9]{4,6})/i
  },
  {
    provider: 'aliyun',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/(?:www\.)?(?:alipan\.com|aliyundrive\.com)\/s\/[a-zA-Z0-9_-]+(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]pwd=([a-zA-Z0-9]{4})/i
  },
  {
    provider: '115',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/115\.com\/s\/[a-zA-Z0-9_-]+(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]password=([a-zA-Z0-9]+)/i
  },
  {
    provider: '123pan',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/(?:www\.)?(?:123pan\.com|123684\.com)\/s\/[a-zA-Z0-9_-]+(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]pwd=([a-zA-Z0-9]{4})/i
  },
  {
    provider: 'xunlei',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/pan\.xunlei\.com\/s\/[a-zA-Z0-9_-]+(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]pwd=([a-zA-Z0-9]{4})/i
  },
  {
    provider: 'uc',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/drive\.uc\.cn\/s\/[a-zA-Z0-9_-]+(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]pwd=([a-zA-Z0-9]{4,6})/i
  },
  {
    provider: 'tianyi',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/cloud\.189\.cn\/(?:t\/[a-zA-Z0-9_-]+|web\/share\?code=[a-zA-Z0-9_-]+)(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]code=([a-zA-Z0-9]{4})/i
  },
  {
    provider: 'pikpak',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/(?:www\.)?(?:mypikpak\.com|pikpak\.me)\/s\/[a-zA-Z0-9_-]+(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]pwd=([a-zA-Z0-9]{4,6})/i
  },
  {
    provider: 'mobile',
    resourceType: 'cloud_drive',
    urlRegex: /https?:\/\/(?:caiyun\.feixin\.10086\.cn|yun\.139\.com)\/[a-zA-Z0-9_-]+(?:\?[a-zA-Z0-9_=&%-]+)?/gi,
    pwdParamRegex: /[?&]pwd=([a-zA-Z0-9]{4})/i
  },
  {
    provider: 'magnet',
    resourceType: 'magnet',
    urlRegex: /magnet:\?xt=urn:btih:[a-zA-Z0-9]+(?:&[a-zA-Z0-9_=&%-]+)*/gi
  },
  {
    provider: 'ed2k',
    resourceType: 'ed2k',
    urlRegex: /ed2k:\/\/\|file\|[^|]+\|\d+\|[a-fA-F0-9]{32}\|(?:\/|h=[a-zA-Z0-9]+\|\/)?/gi
  }
]

// Patterns to identify password / extract code in surrounding text
const SURROUNDING_PWD_REGEX = /(?:提取码|密码|访问码|pwd|code)[:：\s]*([a-zA-Z0-9]{4,6})/i

// Common promotional patterns to filter out of extracted titles
const AD_LINE_PATTERNS = [
  /更多资源/i,
  /关注公众号/i,
  /点击链接/i,
  /加入频道/i,
  /频道地址/i,
  /防走丢/i,
  /备用发布/i,
  /请勿商用/i,
  /侵删/i,
  /失效请反馈/i
]

/**
 * Extracts clean title candidate from multiline text block.
 */
export function extractCleanTitle(text: string, fallbackTitle?: string): string {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  for (const line of lines) {
    if (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('magnet:?')) continue
    if (AD_LINE_PATTERNS.some(p => p.test(line))) continue
    const clean = line
      .replace(/^[【\[（(][^】\]）)]+[】\]）)]\s*/, '') // remove leading tag like 【4K原画】
      .replace(/^#\S+\s*/g, '') // remove hashtag
      .trim()
    if (clean.length >= 2) return clean
  }

  return (fallbackTitle || '').trim() || '未命名资源'
}

/**
 * Parses freeform text (e.g. from Telegram message or forum post) to extract
 * all cloud drive and magnet links with their associated passwords and clean titles.
 */
export function extractPanResourcesFromText(
  text: string,
  defaultTitle?: string
): ExtractedResource[] {
  if (!text) return []

  const results: ExtractedResource[] = []
  const baseTitle = extractCleanTitle(text, defaultTitle)

  for (const rule of PROVIDER_RULES) {
    rule.urlRegex.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = rule.urlRegex.exec(text)) !== null) {
      const url = match[0]
      const startIndex = match.index
      const endIndex = startIndex + url.length

      let password: string | undefined

      // 1. Check url param
      if (rule.pwdParamRegex) {
        const urlMatch = rule.pwdParamRegex.exec(url)
        if (urlMatch) password = urlMatch[1]
      }

      // 2. Check text following the URL up to the next link (or within 100 chars)
      if (!password) {
        const afterChunk = text.slice(endIndex, endIndex + 100)
        const nextLinkIndex = afterChunk.search(/https?:\/\/|magnet:\?/i)
        const effectiveAfter = nextLinkIndex >= 0 ? afterChunk.slice(0, nextLinkIndex) : afterChunk
        const pwdMatchAfter = SURROUNDING_PWD_REGEX.exec(effectiveAfter)
        if (pwdMatchAfter) {
          password = pwdMatchAfter[1]
        }
      }

      // 3. If still not found, check the same line before the URL
      if (!password) {
        const beforeChunk = text.slice(Math.max(0, startIndex - 60), startIndex)
        const lastLineBreak = Math.max(beforeChunk.lastIndexOf('\n'), beforeChunk.lastIndexOf('\r'))
        const effectiveBefore = lastLineBreak >= 0 ? beforeChunk.slice(lastLineBreak + 1) : beforeChunk
        const pwdMatchBefore = SURROUNDING_PWD_REGEX.exec(effectiveBefore)
        if (pwdMatchBefore) {
          password = pwdMatchBefore[1]
        }
      }

      let infohash: string | undefined
      if (rule.provider === 'magnet') {
        const hashMatch = /urn:btih:([a-zA-Z0-9]{32,40})/i.exec(url)
        if (hashMatch) infohash = hashMatch[1].toLowerCase()
      }

      results.push({
        url,
        provider: rule.provider,
        resourceType: rule.resourceType,
        password,
        title: baseTitle,
        infohash
      })
    }
  }

  return results
}
