import { globalRateLimiter } from '../core/security/rate-limit'

function getClientIp(event: any): string {
  const headers = event?.node?.req?.headers || event?.headers || {}
  const cfIp = headers['cf-connecting-ip']
  if (typeof cfIp === 'string' && cfIp) return cfIp
  const forwarded = headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}

function getLimitForPath(path: string): number | null {
  if (path.startsWith('/api/v1/admin/login')) return 5
  if (path.startsWith('/api/v1/search/live')) return 15
  if (path.startsWith('/api/v1/search')) return 60
  if (path.startsWith('/api/v1/ingest')) return 120
  return null
}

export default defineEventHandler((event) => {
  if (process.env.DISABLE_RATE_LIMIT === 'true') return

  const rawPath = event.path || event.node?.req?.url || ''
  const path = rawPath.split('?')[0]
  const limit = getLimitForPath(path)
  if (limit === null) return

  const ip = getClientIp(event)
  const key = `${ip}:${path}`

  const result = globalRateLimiter.check(key, limit)
  if (!result.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Rate limit exceeded. Please slow down. Try again in ${result.retryAfterSec || 60}s.`
    })
  }
})
