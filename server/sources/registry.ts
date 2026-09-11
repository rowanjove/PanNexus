import type { BaseSourceAdapter } from './adapter.base'

class SourceRegistry {
  private adapters = new Map<string, BaseSourceAdapter>()

  /**
   * Registers a source adapter instance.
   */
  register(adapter: BaseSourceAdapter) {
    this.adapters.set(adapter.id, adapter)
  }

  /**
   * Retrieves an adapter by its ID.
   */
  get(id: string): BaseSourceAdapter | undefined {
    return this.adapters.get(id)
  }

  /**
   * Returns all registered adapters.
   */
  getAll(): BaseSourceAdapter[] {
    return Array.from(this.adapters.values())
  }

  /**
   * Returns adapters that support live search, ordered by priority (highest first).
   */
  getSearchAdapters(): BaseSourceAdapter[] {
    return this.getAll()
      .filter(a => a.capabilities.search && a.circuitBreaker.canExecute())
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Returns adapters that support periodic crawl.
   */
  getCrawlAdapters(): BaseSourceAdapter[] {
    return this.getAll()
      .filter(a => a.capabilities.crawl && a.circuitBreaker.canExecute())
      .sort((a, b) => b.priority - a.priority)
  }
}

export const sourceRegistry = new SourceRegistry()
