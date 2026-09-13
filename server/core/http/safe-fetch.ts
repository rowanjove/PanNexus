import { isSafeUrl } from '../security/ssrf'

const DEFAULT_UA = 'MetaSeek/1.0 (federated-index; +https://github.com/metaseek)'

export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'UnsafeUrlError'
  }
}

export async function safeFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const check = isSafeUrl(url)
  if (!check.safe) {
    throw new UnsafeUrlError(check.reason || 'URL blocked by SSRF guard')
  }

  const { timeoutMs = 8000, headers, signal, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    let current = url
    for (let hop = 0; hop < 4; hop++) {
      const hopCheck = isSafeUrl(current)
      if (!hopCheck.safe) {
        throw new UnsafeUrlError(hopCheck.reason || 'URL blocked by SSRF guard')
      }

      const res = await fetch(current, {
        ...rest,
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': DEFAULT_UA,
          Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
          ...(headers || {})
        }
      })

      if (res.status < 300 || res.status >= 400) return res
      const location = res.headers.get('location')
      if (!location) return res
      current = new URL(location, current).toString()
    }
    throw new UnsafeUrlError('Too many redirects')
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}
