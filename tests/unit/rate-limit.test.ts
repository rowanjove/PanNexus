import { describe, it, expect, beforeEach } from 'vitest'
import { SlidingWindowRateLimiter } from '../../server/core/security/rate-limit'

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter(5, 1000) // 5 requests per 1s
  })

  it('allows requests within threshold', () => {
    for (let i = 0; i < 5; i++) {
      const res = limiter.check('ip_1')
      expect(res.allowed).toBe(true)
      expect(res.remaining).toBe(4 - i)
    }
  })

  it('blocks requests exceeding threshold', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('ip_1')
    }
    const blocked = limiter.check('ip_1')
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1)
  })

  it('isolates different keys independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user_a')
    }
    expect(limiter.check('user_a').allowed).toBe(false)
    expect(limiter.check('user_b').allowed).toBe(true)
  })

  it('supports custom limits per call', () => {
    const strictLimiter = new SlidingWindowRateLimiter(10, 1000)
    // Overriding with custom limit 2
    expect(strictLimiter.check('strict_route', 2).allowed).toBe(true)
    expect(strictLimiter.check('strict_route', 2).allowed).toBe(true)
    expect(strictLimiter.check('strict_route', 2).allowed).toBe(false)
  })
})
