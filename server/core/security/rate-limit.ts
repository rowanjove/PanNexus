export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSec?: number
}

export class SlidingWindowRateLimiter {
  private records = new Map<string, number[]>()
  private lastCleanup = Date.now()

  constructor(
    private readonly defaultLimit: number = 60,
    private readonly windowMs: number = 60_000
  ) {}

  check(key: string, customLimit?: number): RateLimitResult {
    const limit = customLimit !== undefined ? customLimit : this.defaultLimit
    const now = Date.now()
    this.cleanup(now)

    let timestamps = this.records.get(key)
    if (!timestamps) {
      timestamps = []
      this.records.set(key, timestamps)
    }

    const cutoff = now - this.windowMs
    timestamps = timestamps.filter(t => t > cutoff)
    this.records.set(key, timestamps)

    if (timestamps.length >= limit) {
      const oldest = timestamps[0]
      const retryAfterSec = Math.ceil((oldest + this.windowMs - now) / 1000)
      return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, retryAfterSec) }
    }

    timestamps.push(now)
    return { allowed: true, remaining: limit - timestamps.length }
  }

  private cleanup(now: number) {
    if (now - this.lastCleanup < this.windowMs) return
    this.lastCleanup = now
    const cutoff = now - this.windowMs
    for (const [k, v] of this.records.entries()) {
      const active = v.filter(t => t > cutoff)
      if (active.length === 0) this.records.delete(k)
      else this.records.set(k, active)
    }
  }

  reset() {
    this.records.clear()
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter(60, 60_000)
