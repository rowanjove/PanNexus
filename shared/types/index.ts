export type ResourceType =
  | 'cloud_drive'
  | 'magnet'
  | 'torrent'
  | 'ed2k'
  | 'http'
  | 'other'

export type ContentCategory =
  | 'movie'
  | 'tv'
  | 'anime'
  | 'book'
  | 'game'
  | 'music'
  | 'software'
  | 'document'
  | 'other'

export type Provider =
  | 'baidu'
  | 'aliyun'
  | 'quark'
  | 'uc'
  | '115'
  | 'xunlei'
  | 'tianyi'
  | '123pan'
  | 'mobile'
  | 'pikpak'
  | 'magnet'
  | 'torrent'
  | 'ed2k'
  | 'unknown'

export type ResourceStatus =
  | 'active'
  | 'unknown'
  | 'stale'
  | 'dead'
  | 'locked'

export type CircuitState =
  | 'closed'
  | 'open'
  | 'half_open'

export type SourceType =
  | 'telegram'
  | 'html'
  | 'api'
  | 'rss'
  | 'torznab'
  | 'custom'

export interface ResourceFile {
  id?: number
  resourceId?: number
  path?: string
  filename: string
  extension?: string
  sizeBytes?: number
}

export interface Resource {
  id: number
  canonicalId?: string | null
  title: string
  normalizedTitle?: string | null
  resourceType: ResourceType
  provider: Provider
  url?: string | null
  urlHash?: string | null
  infohash?: string | null
  password?: string | null
  sizeBytes?: number | null
  fileCount?: number | null
  sourceId?: number | null
  publishedAt?: number | null
  discoveredAt?: number | null
  lastSeenAt?: number | null
  status: ResourceStatus
  qualityScore: number
  popularityScore: number
  metadata?: Record<string, unknown> | string | null
  createdAt: number
  updatedAt: number
}

export interface CanonicalResource {
  id: string // e.g. "wandering-earth-2-2023-4k"
  title: string
  originalTitle?: string | null
  category?: string | null
  year?: number | null
  season?: number | null
  episode?: number | null
  resolution?: string | null
  codec?: string | null
  audio?: string | null
  edition?: string | null
  normalizedKey: string
  posterUrl?: string | null
  backdropUrl?: string | null
  metadata?: Record<string, unknown> | string | null
  createdAt: number
  updatedAt: number
  // Aggregation properties for UI & Search Results
  resources?: Resource[]
  sourceCount?: number
  providerCounts?: Record<Provider, number>
  minSizeBytes?: number | null
  maxSizeBytes?: number | null
  healthScore?: number
  latestDiscoveredAt?: number | null
}

export interface Source {
  id: number
  sourceKey: string
  name: string
  type: SourceType
  enabled: boolean
  priority: number
  healthScore: number
  avgLatency: number
  successCount: number
  failureCount: number
  circuitState: CircuitState
  lastSuccessAt?: number | null
  lastFailureAt?: number | null
  lastCrawlAt?: number | null
  config?: Record<string, unknown> | string | null
}

export interface RawResource {
  title: string
  url?: string
  resourceType?: ResourceType
  provider?: Provider
  password?: string
  infohash?: string
  size?: number
  fileCount?: number
  publishedAt?: number
  files?: ResourceFile[]
  metadata?: Record<string, unknown>
  sourceItemId?: string
}

export interface SourceHealth {
  sourceId: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number
  circuitState: CircuitState
  successRate: number
  lastCheckedAt: number
}

export interface SearchQuery {
  q: string
  category?: string
  type?: ResourceType | 'all'
  provider?: Provider | 'all'
  resolution?: string
  minSize?: number
  maxSize?: number
  status?: ResourceStatus | 'all'
  sort?: 'rank' | 'freshness' | 'size_desc' | 'size_asc' | 'sources'
  page?: number
  limit?: number
}

export interface SearchResult {
  items: CanonicalResource[]
  total: number
  page: number
  limit: number
  latencyMs: number
  query: {
    raw: string
    normalizedKeyword: string
    resolution?: string
    year?: number
    edition?: string
  }
}
