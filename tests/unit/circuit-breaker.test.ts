import { describe, it, expect } from 'vitest'
import { CircuitBreaker } from '../../server/core/health/circuit-breaker'

describe('Circuit Breaker State Machine', () => {
  it('trips from CLOSED to OPEN after consecutive failures', () => {
    const cb = new CircuitBreaker({ maxConsecutiveFailures: 3, cooldownMs: 1000 })

    expect(cb.state).toBe('closed')
    expect(cb.canExecute()).toBe(true)

    cb.recordFailure()
    cb.recordFailure()
    expect(cb.state).toBe('closed')

    cb.recordFailure()
    expect(cb.state).toBe('open')
    expect(cb.canExecute()).toBe(false)
  })

  it('transitions to HALF_OPEN after cooldown and recovers to CLOSED on success', async () => {
    const cb = new CircuitBreaker({ maxConsecutiveFailures: 2, cooldownMs: 50 })

    cb.recordFailure()
    cb.recordFailure()
    expect(cb.state).toBe('open')

    await new Promise(r => setTimeout(r, 60))

    expect(cb.canExecute()).toBe(true)
    expect(cb.state).toBe('half_open')

    cb.recordSuccess(120)
    expect(cb.state).toBe('closed')
    expect(cb.consecutiveFailures).toBe(0)
    expect(cb.avgLatencyMs).toBe(120)
  })
})
