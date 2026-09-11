import type { CircuitState } from '~/shared/types'

export interface CircuitBreakerConfig {
  maxConsecutiveFailures: number
  cooldownMs: number // Cooldown time before attempting HALF_OPEN
}

export class CircuitBreaker {
  public state: CircuitState = 'closed'
  public consecutiveFailures = 0
  public consecutiveSuccesses = 0
  public lastFailureAt?: number
  public lastSuccessAt?: number
  public totalSuccesses = 0
  public totalFailures = 0
  public avgLatencyMs = 0

  private config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      maxConsecutiveFailures: config.maxConsecutiveFailures ?? 5,
      cooldownMs: config.cooldownMs ?? 30 * 60 * 1000 // 30 minutes default
    }
  }

  /**
   * Checks if requests are currently allowed to pass through.
   */
  public canExecute(): boolean {
    const now = Date.now()

    if (this.state === 'closed') {
      return true
    }

    if (this.state === 'open') {
      if (this.lastFailureAt && now - this.lastFailureAt >= this.config.cooldownMs) {
        this.state = 'half_open'
        return true // Allow one probe request
      }
      return false
    }

    if (this.state === 'half_open') {
      // In half_open, allow trial execution
      return true
    }

    return true
  }

  /**
   * Reports execution success and latency.
   */
  public recordSuccess(latencyMs: number) {
    this.lastSuccessAt = Date.now()
    this.totalSuccesses++
    this.consecutiveSuccesses++
    this.consecutiveFailures = 0

    // Moving average for latency
    if (this.avgLatencyMs === 0) {
      this.avgLatencyMs = latencyMs
    } else {
      this.avgLatencyMs = Math.round(this.avgLatencyMs * 0.8 + latencyMs * 0.2)
    }

    if (this.state === 'half_open' || this.state === 'open') {
      this.state = 'closed'
    }
  }

  /**
   * Reports execution failure.
   */
  public recordFailure() {
    this.lastFailureAt = Date.now()
    this.totalFailures++
    this.consecutiveFailures++
    this.consecutiveSuccesses = 0

    if (this.state === 'half_open') {
      // Immediate trip back to open
      this.state = 'open'
    } else if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.state = 'open'
    }
  }

  /**
   * Computes health score from 0.0 to 1.0.
   */
  public getHealthScore(): number {
    if (this.state === 'open') return 0.0
    if (this.state === 'half_open') return 0.5
    const total = this.totalSuccesses + this.totalFailures
    if (total === 0) return 1.0
    const rate = this.totalSuccesses / total
    return Number(rate.toFixed(3))
  }

  /**
   * Manually resets circuit breaker to closed state.
   */
  public reset() {
    this.state = 'closed'
    this.consecutiveFailures = 0
  }
}
