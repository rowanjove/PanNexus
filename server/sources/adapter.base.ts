import type { RawResource, SearchQuery, SourceHealth, SourceType } from '~/shared/types'
import { CircuitBreaker } from '../core/health/circuit-breaker'

export interface AdapterCapabilities {
  crawl?: boolean
  search?: boolean
  healthCheck?: boolean
}

export interface CrawlResult {
  items: RawResource[]
  nextCursor?: string
}

export abstract class BaseSourceAdapter {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly type: SourceType
  readonly priority: number = 50
  readonly timeoutMs: number = 6000
  readonly capabilities: AdapterCapabilities = {
    crawl: false,
    search: false,
    healthCheck: true
  }

  public readonly circuitBreaker: CircuitBreaker

  constructor(circuitBreaker?: CircuitBreaker) {
    this.circuitBreaker = circuitBreaker ?? new CircuitBreaker()
  }

  /**
   * Executes a search with circuit breaker, timeout, and error isolation.
   */
  async executeSearch(query: SearchQuery): Promise<RawResource[]> {
    if (!this.capabilities.search || !this.search) {
      return []
    }

    if (!this.circuitBreaker.canExecute()) {
      return []
    }

    const start = Date.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const results = await this.search(query, controller.signal)
      clearTimeout(timer)
      this.circuitBreaker.recordSuccess(Date.now() - start)
      return results
    } catch (err: unknown) {
      clearTimeout(timer)
      this.circuitBreaker.recordFailure()
      return []
    }
  }

  /**
   * Executes a crawl task with error isolation.
   */
  async executeCrawl(cursor?: string): Promise<CrawlResult> {
    if (!this.capabilities.crawl || !this.crawl) {
      return { items: [] }
    }

    if (!this.circuitBreaker.canExecute()) {
      return { items: [] }
    }

    const start = Date.now()
    try {
      const result = await this.crawl(cursor)
      this.circuitBreaker.recordSuccess(Date.now() - start)
      return result
    } catch {
      this.circuitBreaker.recordFailure()
      return { items: [] }
    }
  }

  /**
   * Subclasses implement actual search.
   */
  protected abstract search?(query: SearchQuery, signal: AbortSignal): Promise<RawResource[]>

  /**
   * Subclasses implement actual crawl.
   */
  protected abstract crawl?(cursor?: string): Promise<CrawlResult>

  /**
   * Default health check returning circuit breaker status.
   */
  async checkHealth(): Promise<SourceHealth> {
    return {
      sourceId: this.id,
      status: this.circuitBreaker.state === 'closed' ? 'healthy' : this.circuitBreaker.state === 'half_open' ? 'degraded' : 'down',
      latencyMs: this.circuitBreaker.avgLatencyMs,
      circuitState: this.circuitBreaker.state,
      successRate: this.circuitBreaker.getHealthScore(),
      lastCheckedAt: Date.now()
    }
  }
}
