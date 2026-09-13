import { safeFetch } from '../http/safe-fetch'

export interface LivenessResult {
  alive: boolean
  reason?: string
  statusCode?: number
}

const INVALID_PATTERNS = [
  /链接已失效/i,
  /分享已被取消/i,
  /该文件已失效/i,
  /文件已被删除/i,
  /分享的内容已被删除/i,
  /此分享已过期/i,
  /页面不存在/i,
  /该分享不存在/i,
  /404 Not Found/i
]

/**
 * Lightweight liveness checker for public cloud drive sharing links.
 * Returns alive: true unless explicit cancellation / deletion is detected.
 */
export async function checkPanLinkLiveness(
  url: string,
  signal?: AbortSignal
): Promise<LivenessResult> {
  if (!url) return { alive: false, reason: 'empty_url' }

  // Magnets are inherently decentralized, format-validity is considered alive
  if (url.startsWith('magnet:?')) {
    const hasBtih = /urn:btih:[a-zA-Z0-9]{32,40}/i.test(url)
    return { alive: hasBtih, reason: hasBtih ? undefined : 'invalid_magnet_btih' }
  }

  try {
    const res = await safeFetch(url, {
      signal,
      timeoutMs: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (res.status === 404 || res.status === 410) {
      return { alive: false, statusCode: res.status, reason: 'http_not_found' }
    }

    // Inspect final redirected URL
    const finalUrl = res.url || ''
    if (finalUrl.includes('/error') || finalUrl.includes('/invalid') || finalUrl.includes('code=404')) {
      return { alive: false, reason: 'redirected_to_error_page' }
    }

    const html = (await res.text()).slice(0, 10_000)
    for (const pattern of INVALID_PATTERNS) {
      if (pattern.test(html)) {
        return { alive: false, reason: 'content_indicates_expired' }
      }
    }

    return { alive: true }
  } catch {
    // Be conservative on network timeout or connection reset: do not prematurely declare dead
    return { alive: true, reason: 'timeout_fallback_assumed_alive' }
  }
}
