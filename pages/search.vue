<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CanonicalResource, Resource, ResourceType, Provider } from '~/shared/types'
import ResourceCard from '~/components/ResourceCard.vue'
import ResourceDrawer from '~/components/ResourceDrawer.vue'
import { Search, Radio, Check } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const queryInput = ref(String(route.query.q || ''))
// The master in-memory canonical pool: retains both local DB results and live SSE results
const allResults = ref<CanonicalResource[]>([])
const latencyMs = ref(0)
const isLoading = ref(false)
const lastFetchedQuery = ref('')

// Pagination state: max 50 items per page
const currentPage = ref(1)
const pageSize = ref(50)

export interface CategoryOption {
  label: string
  value: string
}

const categoryOptions: CategoryOption[] = [
  { label: '全部品类', value: 'all' },
  { label: '电影', value: 'movie' },
  { label: '剧集', value: 'tv' },
  { label: '动漫', value: 'anime' },
  { label: '图书', value: 'book' },
  { label: '游戏', value: 'game' },
  { label: '音乐', value: 'music' },
  { label: '软件', value: 'software' },
  { label: '资料', value: 'document' }
]

const filterCategory = ref<string>((route.query.category as string) || 'all')

function selectCategory(cat: string) {
  filterCategory.value = cat
  currentPage.value = 1
  updateFilterQuery()
}

const typeOptions: { label: string; value: ResourceType }[] = [
  { label: '网盘分享', value: 'cloud_drive' },
  { label: '磁力链接', value: 'magnet' },
  { label: '种子文件', value: 'torrent' },
  { label: '软件/资料', value: 'other' }
]

// Multi-select type filter state
const selectedTypes = ref<ResourceType[]>(['cloud_drive', 'magnet', 'torrent', 'other'])
const isAllSelected = computed(() => selectedTypes.value.length === typeOptions.length)

// Initialize filters from route query if present
if (route.query.type) {
  const parsed = String(route.query.type).split(',').filter(Boolean) as ResourceType[]
  if (parsed.length > 0) selectedTypes.value = parsed
}

function toggleAllTypes() {
  if (isAllSelected.value) {
    selectedTypes.value = []
  } else {
    selectedTypes.value = typeOptions.map(t => t.value)
  }
  currentPage.value = 1
  updateFilterQuery()
}

function toggleType(type: ResourceType) {
  const idx = selectedTypes.value.indexOf(type)
  if (idx >= 0) {
    selectedTypes.value.splice(idx, 1)
  } else {
    selectedTypes.value.push(type)
  }
  currentPage.value = 1
  updateFilterQuery()
}

// Single-choice filters
const filterProvider = ref<Provider | 'all'>((route.query.provider as any) || 'all')
const filterResolution = ref<string>((route.query.resolution as any) || 'all')
const filterSort = ref<'rank' | 'freshness' | 'size_desc'>('rank')

function selectProvider(p: Provider | 'all') {
  filterProvider.value = p
  currentPage.value = 1
  updateFilterQuery()
}

function selectResolution(r: string) {
  filterResolution.value = r
  currentPage.value = 1
  updateFilterQuery()
}

function updateFilterQuery() {
  const typeParam = isAllSelected.value || selectedTypes.value.length === 0
    ? undefined
    : selectedTypes.value.join(',')

  router.replace({
    query: {
      ...route.query,
      category: filterCategory.value === 'all' ? undefined : filterCategory.value,
      type: typeParam,
      provider: filterProvider.value === 'all' ? undefined : filterProvider.value,
      resolution: filterResolution.value === 'all' ? undefined : filterResolution.value
    }
  })
}


// Deep Search (SSE) state
const isDeepSearching = ref(false)
const deepSearchStatus = ref('')
const deepSearchNewCount = ref(0)

// Drawer state
const selectedResource = ref<Resource | null>(null)
const isDrawerOpen = ref(false)

const providersList: { label: string; value: Provider | 'all' }[] = [
  { label: '全部来源', value: 'all' },
  { label: '夸克', value: 'quark' },
  { label: '百度', value: 'baidu' },
  { label: '阿里', value: 'aliyun' },
  { label: '115', value: '115' },
  { label: '123云盘', value: '123pan' },
  { label: '天翼云', value: 'tianyi' },
  { label: '移动云', value: 'mobile' },
  { label: 'UC网盘', value: 'uc' },
  { label: '迅雷', value: 'xunlei' },
  { label: '磁力', value: 'magnet' },
  { label: '种子', value: 'torrent' }
]

const resolutionsList = [
  { label: '全部画质', value: 'all' },
  { label: '4K/2160p', value: '2160p' },
  { label: '1080p', value: '1080p' },
  { label: '720p', value: '720p' }
]

// Real-time Category Counts from the canonical pool
const categoryCountsMap = computed(() => {
  const counts: Record<string, number> = {
    all: allResults.value.length,
    movie: 0,
    tv: 0,
    anime: 0,
    book: 0,
    game: 0,
    music: 0,
    software: 0,
    document: 0
  }
  for (const item of allResults.value) {
    const c = item.category || 'other'
    if (c === 'movie') counts.movie++
    else if (c === 'tv') counts.tv++
    else if (c === 'anime') counts.anime++
    else if (c === 'book') counts.book++
    else if (c === 'game') counts.game++
    else if (c === 'music') counts.music++
    else if (c === 'software') counts.software++
    else counts.document++
  }
  return counts
})

// Real-time Provider Counts from the canonical pool
const providerCountsMap = computed(() => {
  const counts: Record<string, number> = {
    all: allResults.value.length,
    quark: 0,
    baidu: 0,
    aliyun: 0,
    '115': 0,
    '123pan': 0,
    tianyi: 0,
    mobile: 0,
    uc: 0,
    xunlei: 0,
    magnet: 0,
    torrent: 0
  }
  for (const item of allResults.value) {
    const itemProviders = new Set<string>()
    if (item.providerCounts) {
      for (const p of Object.keys(item.providerCounts)) {
        if ((item.providerCounts as any)[p] > 0) itemProviders.add(p)
      }
    }
    if (item.resources) {
      for (const r of item.resources) {
        if (r.provider) itemProviders.add(r.provider)
      }
    }
    for (const p of itemProviders) {
      if (counts[p] !== undefined) {
        counts[p]++
      }
    }
  }
  return counts
})

// Filtered Results computed reactively without wiping raw data
const filteredResults = computed(() => {
  let list = allResults.value

  // 0. Content Category Filter
  if (filterCategory.value !== 'all') {
    list = list.filter(item => {
      const c = item.category || 'other'
      if (filterCategory.value === 'document') {
        return c === 'document' || c === 'other'
      }
      return c === filterCategory.value
    })
  }

  // 1. Resource Type Multi-select
  if (!isAllSelected.value && selectedTypes.value.length > 0) {
    list = list.filter(item => {
      if (item.resources && item.resources.length > 0) {
        return item.resources.some(r => selectedTypes.value.includes(r.resourceType))
      }
      return false
    })
  } else if (selectedTypes.value.length === 0) {
    return []
  }


  // 2. Storage Channel / Provider
  if (filterProvider.value !== 'all') {
    list = list.filter(item => {
      if (item.providerCounts && item.providerCounts[filterProvider.value as Provider] > 0) {
        return true
      }
      if (item.resources && item.resources.length > 0) {
        return item.resources.some(r => r.provider === filterProvider.value)
      }
      return false
    })
  }

  // 3. Resolution Filter
  if (filterResolution.value !== 'all') {
    list = list.filter(item => {
      if (item.resolution === filterResolution.value) return true
      if (item.resources && item.resources.length > 0) {
        return item.resources.some(r => {
          const meta = typeof r.metadata === 'string' ? r.metadata : JSON.stringify(r.metadata || {})
          return meta.includes(filterResolution.value)
        })
      }
      return false
    })
  }

  // 4. Sort
  const sorted = [...list]
  if (filterSort.value === 'size_desc') {
    sorted.sort((a, b) => (b.maxSizeBytes || 0) - (a.maxSizeBytes || 0))
  } else if (filterSort.value === 'freshness') {
    sorted.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
  } else {
    sorted.sort((a, b) => (b.sourceCount || 1) - (a.sourceCount || 1))
  }

  return sorted
})

// Pagination Computations
const totalFilteredCount = computed(() => filteredResults.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalFilteredCount.value / pageSize.value)))

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredResults.value.slice(start, start + pageSize.value)
})

// Chunked progressive rendering to prevent long main-thread frame drops
const renderedLimit = ref(12)

watch(
  [paginatedResults, currentPage],
  () => {
    renderedLimit.value = Math.min(12, paginatedResults.value.length)
    if (renderedLimit.value < paginatedResults.value.length) {
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          renderedLimit.value = paginatedResults.value.length
        })
      }
    }
  },
  { immediate: true }
)

const displayedPaginatedResults = computed(() => {
  return paginatedResults.value.slice(0, renderedLimit.value)
})

const visiblePageNumbers = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Featured Canonical Authority Spotlight (movie / anime / book with poster)
const featuredHeroCanonical = computed(() => {
  if (filteredResults.value.length === 0) return null
  return filteredResults.value.find(c => Boolean(c.posterUrl)) || null
})

let activeEventSource: EventSource | null = null

// Fetch local/native index results (direct real-time query, no client cache)
async function fetchResults(force = false) {
  const q = queryInput.value.trim()
  if (!q) {
    allResults.value = []
    lastFetchedQuery.value = ''
    if (activeEventSource) {
      activeEventSource.close()
      activeEventSource = null
      isDeepSearching.value = false
    }
    return
  }

  if (!force && q === lastFetchedQuery.value && allResults.value.length > 0) {
    return
  }

  isLoading.value = true
  lastFetchedQuery.value = q
  currentPage.value = 1

  try {
    const data = await $fetch<any>('/api/v1/search', {
      params: {
        q,
        category: filterCategory.value === 'all' ? undefined : filterCategory.value,
        limit: 100
      }
    })
    const items = data?.items || []
    const ms = data?.latencyMs || 0
    allResults.value = items
    latencyMs.value = ms

    // 当本地索引库未命中匹配结果时，自动无缝触发全网联邦实时深度嗅探
    if (items.length === 0 && !isDeepSearching.value) {
      triggerDeepSearch()
    }
  } catch (err) {
    allResults.value = []
    latencyMs.value = 0
  } finally {
    isLoading.value = false
  }
}

function handleSearchSubmit() {
  const q = queryInput.value.trim()
  if (!q) return

  currentPage.value = 1
  router.push({
    path: '/search',
    query: {
      ...route.query,
      q
    }
  })
  fetchResults(true)
}

// Watch keyword and category changes in route
watch(
  () => [route.query.q, route.query.category],
  ([newQ, newCat]) => {
    queryInput.value = String(newQ || '')
    if (newCat) {
      filterCategory.value = String(newCat)
    }
    fetchResults(true)
  },
  { immediate: true }
)

// Trigger Deep Search via SSE
function triggerDeepSearch() {
  const q = queryInput.value.trim()
  if (!q) return

  if (activeEventSource) {
    activeEventSource.close()
    activeEventSource = null
  }

  isDeepSearching.value = true
  deepSearchStatus.value = '正在向联邦节点发起实时检索...'
  deepSearchNewCount.value = 0

  const catParam = filterCategory.value !== 'all' ? `&category=${encodeURIComponent(filterCategory.value)}` : ''
  const eventSource = new EventSource(`/api/v1/search/live?q=${encodeURIComponent(q)}${catParam}`)
  activeEventSource = eventSource

  eventSource.addEventListener('source_start', (e) => {
    try {
      const data = JSON.parse(e.data)
      deepSearchStatus.value = `正在检索: ${data.sourceName}...`
    } catch {}
  })

  eventSource.addEventListener('resource', (e) => {
    try {
      const data = JSON.parse(e.data)
      deepSearchNewCount.value++

      // Merge into canonical pool
      const incomingRes = data.rawResource
      const canon = data.canonical

      const existingIndex = allResults.value.findIndex(
        c => c.id === canon.id || c.normalizedKey === canon.normalizedKey
      )

      if (existingIndex >= 0) {
        const existing = allResults.value[existingIndex]
        existing.resources = existing.resources || []
        const alreadyHas = existing.resources.some(
          r => (r.url && incomingRes.url && r.url === incomingRes.url) ||
               (r.infohash && incomingRes.infohash && r.infohash === incomingRes.infohash)
        )
        if (!alreadyHas) {
          existing.resources.push(incomingRes)
          existing.sourceCount = existing.resources.length
          existing.providerCounts = existing.providerCounts || {} as any
          existing.providerCounts[incomingRes.provider] = (existing.providerCounts[incomingRes.provider] || 0) + 1
          if (incomingRes.size && (!existing.maxSizeBytes || incomingRes.size > existing.maxSizeBytes)) {
            existing.maxSizeBytes = incomingRes.size
          }
        }
      } else {
        allResults.value.push({
          ...canon,
          resources: [incomingRes],
          sourceCount: 1,
          providerCounts: { [incomingRes.provider]: 1 } as any,
          maxSizeBytes: incomingRes.size,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      }
    } catch {}
  })

  eventSource.addEventListener('complete', () => {
    deepSearchStatus.value = `深度搜索完成，累计获取 ${deepSearchNewCount.value} 条补充结果`
    isDeepSearching.value = false
    eventSource.close()
    if (activeEventSource === eventSource) {
      activeEventSource = null
    }
  })

  eventSource.addEventListener('error', () => {
    isDeepSearching.value = false
    eventSource.close()
    if (activeEventSource === eventSource) {
      activeEventSource = null
    }
  })
}

onUnmounted(() => {
  if (activeEventSource) {
    activeEventSource.close()
    activeEventSource = null
  }
})


function openInspect(resource: Resource) {
  selectedResource.value = resource
  isDrawerOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- Top Search Bar & Actions -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
      <form
        @submit.prevent="handleSearchSubmit"
        class="flex-1 relative flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111114] shadow-sm p-1 focus-within:border-zinc-900 dark:focus-within:border-zinc-100"
      >
        <div class="pl-3 pr-2 text-zinc-400 shrink-0 flex items-center">
          <Search class="w-4 h-4" />
        </div>
        <input
          id="global-search-input"
          v-model="queryInput"
          type="text"
          placeholder="搜索资源、影视、动漫、软件..."
          class="flex-1 min-w-0 py-2 px-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
        />
        <button
          type="submit"
          class="px-5 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-mono text-xs font-semibold transition-opacity flex items-center gap-1 shrink-0 ml-1.5 shadow-sm"
        >
          <span>检索</span>
        </button>
      </form>

      <!-- Deep Search Action Button -->
      <button
        @click="triggerDeepSearch"
        :disabled="isDeepSearching || !queryInput.trim()"
        class="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        title="向远程数据源发起实时嗅探并补全索引"
      >
        <Radio class="w-3.5 h-3.5" :class="{ 'animate-pulse text-red-500': isDeepSearching }" />
        <span>{{ isDeepSearching ? '正在深度检索...' : '实时深度检索' }}</span>
      </button>
    </div>

    <!-- Filter Bar (Minimalist Segmented Controls) -->
    <div class="p-3.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-3 text-xs font-mono">
      <!-- 1. Content Category (Primary Filter Bar) -->
      <div class="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/60">
        <span class="text-zinc-400 dark:text-zinc-500 w-16 shrink-0">内容品类:</span>
        <button
          v-for="cat in categoryOptions"
          :key="cat.value"
          type="button"
          @click="selectCategory(cat.value)"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors"
          :class="[
            filterCategory === cat.value
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm'
              : 'border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          ]"
        >
          <span>{{ cat.label }}</span>
          <span
            v-if="categoryCountsMap[cat.value] !== undefined"
            class="text-[10px] font-mono opacity-75 ml-0.5"
            :class="filterCategory === cat.value ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'"
          >
            ({{ categoryCountsMap[cat.value] }})
          </span>
        </button>
      </div>

      <!-- Type Multi-select Filter Checkbox Buttons -->
      <div class="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/60">
        <span class="text-zinc-400 dark:text-zinc-500 w-16 shrink-0">协议形式:</span>
        <button
          type="button"
          @click="toggleAllTypes"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-mono transition-colors"
          :class="isAllSelected ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'"
        >
          <span class="w-3 h-3 rounded-sm border flex items-center justify-center text-[9px]" :class="isAllSelected ? 'border-transparent bg-white/20 dark:bg-black/20 text-white dark:text-zinc-900' : 'border-zinc-400 dark:border-zinc-600'">
            <Check v-if="isAllSelected" class="w-2.5 h-2.5 stroke-[3]" />
          </span>
          <span>全部类型</span>
        </button>
        <button
          v-for="item in typeOptions"
          :key="item.value"
          type="button"
          @click="toggleType(item.value)"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-mono transition-colors"
          :class="selectedTypes.includes(item.value) ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'"
        >
          <span class="w-3 h-3 rounded-sm border flex items-center justify-center text-[9px]" :class="selectedTypes.includes(item.value) ? 'border-transparent bg-white/20 dark:bg-black/20 text-white dark:text-zinc-900' : 'border-zinc-400 dark:border-zinc-600'">
            <Check v-if="selectedTypes.includes(item.value)" class="w-2.5 h-2.5 stroke-[3]" />
          </span>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <!-- Provider Filter with Real-time Pool Counts -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-zinc-400 dark:text-zinc-500 w-16 shrink-0">存储渠道:</span>
        <button
          v-for="p in providersList"
          :key="p.value"
          @click="selectProvider(p.value)"
          class="px-2.5 py-1 rounded transition-colors flex items-center gap-1"
          :class="[
            filterProvider === p.value
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          ]"
        >
          <span>{{ p.label }}</span>
          <span
            v-if="providerCountsMap[p.value] !== undefined"
            class="text-[10px] font-mono opacity-75"
            :class="filterProvider === p.value ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'"
          >
            ({{ providerCountsMap[p.value] }})
          </span>
        </button>
      </div>

      <!-- Resolution & Sort Filter -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-zinc-400 dark:text-zinc-500 w-16 shrink-0">画质规格:</span>
          <button
            v-for="r in resolutionsList"
            :key="r.value"
            @click="selectResolution(r.value)"
            class="px-2 py-0.5 rounded transition-colors"
            :class="[
              filterResolution === r.value
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            ]"
          >
            {{ r.label }}
          </button>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-zinc-400 dark:text-zinc-500">排序:</span>
          <select
            v-model="filterSort"
            class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="rank">综合打分 (Rank)</option>
            <option value="freshness">最新收录 (Freshness)</option>
            <option value="size_desc">文件体积 (Size)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Live Deep Search Progress Banner -->
    <div
      v-if="isDeepSearching || deepSearchNewCount > 0"
      class="p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs font-mono flex items-center justify-between"
    >
      <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
        <Radio class="w-4 h-4 animate-pulse text-blue-600 dark:text-blue-400" />
        <span>{{ deepSearchStatus }}</span>
      </div>
      <span class="text-blue-600 dark:text-blue-400 font-bold">+{{ deepSearchNewCount }} 实时新增</span>
    </div>

    <!-- Search Status / Meta -->
    <div class="flex items-center justify-between text-xs font-mono text-zinc-500 px-1">
      <div>
        <span>找到 </span>
        <span class="font-semibold text-zinc-900 dark:text-zinc-100">{{ totalFilteredCount }}</span>
        <span> 个匹配聚合实体</span>
        <span v-if="allResults.length !== totalFilteredCount" class="text-zinc-400 ml-1">
          (资源池共 {{ allResults.length }} 个)
        </span>
        <span v-if="latencyMs > 0" class="ml-2 text-zinc-400">(检索耗时 {{ latencyMs }}ms)</span>
      </div>
      <div class="text-[11px] text-zinc-400">
        每页最多 50 条
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-28 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 animate-pulse" />
    </div>

    <!-- Paginated Results Stream -->
    <div v-else-if="paginatedResults.length > 0" class="space-y-4">
      <!-- Canonical Entity Spotlight Banner (Hero Showcase) -->
      <div
        v-if="featuredHeroCanonical && featuredHeroCanonical.posterUrl && currentPage === 1"
        class="relative overflow-hidden rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-gradient-to-r from-zinc-900 via-[#18181b] to-zinc-900 text-white p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start"
      >
        <!-- Ambient Blur Glow -->
        <div
          class="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl pointer-events-none scale-125"
          :style="{ backgroundImage: `url(${featuredHeroCanonical.backdropUrl || featuredHeroCanonical.posterUrl})` }"
        />

        <!-- Poster with Glass Effect -->
        <img
          :src="featuredHeroCanonical.posterUrl"
          :alt="featuredHeroCanonical.title"
          class="relative z-10 w-24 sm:w-28 aspect-[2/3] object-cover rounded-lg shadow-xl border border-white/20 shrink-0"
        />

        <!-- Information Column -->
        <div class="relative z-10 flex-1 min-w-0 text-center sm:text-left">
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              权威实体
            </span>
            <span v-if="featuredHeroCanonical.year" class="text-xs text-zinc-300 font-mono font-medium">
              {{ featuredHeroCanonical.year }}
            </span>
            <span v-if="featuredHeroCanonical.category" class="text-xs text-zinc-400 font-mono">
              &bull; {{ featuredHeroCanonical.category.toUpperCase() }}
            </span>
          </div>

          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            {{ featuredHeroCanonical.title }}
          </h1>

          <p v-if="featuredHeroCanonical.originalTitle && featuredHeroCanonical.originalTitle !== featuredHeroCanonical.title" class="text-xs text-zinc-400 font-mono mb-3.5 line-clamp-1">
            {{ featuredHeroCanonical.originalTitle }}
          </p>

          <!-- Aggregated Stats Bar -->
          <div class="inline-flex flex-wrap items-center gap-2.5 text-xs font-mono bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/10 shadow-xs">
            <span class="text-zinc-300">联邦资源池:</span>
            <span class="font-bold text-emerald-400">已聚合 {{ featuredHeroCanonical.sourceCount || (featuredHeroCanonical.resources?.length || 0) }} 份版本链接</span>
            <span v-if="featuredHeroCanonical.resolution" class="text-zinc-500">|</span>
            <span v-if="featuredHeroCanonical.resolution" class="text-zinc-200">最高 {{ featuredHeroCanonical.resolution }}</span>
          </div>
        </div>
      </div>

      <ResourceCard
        v-for="canonical in displayedPaginatedResults"
        :key="canonical.id"
        :canonical="canonical"
        :active-provider="filterProvider"
        @inspect="openInspect"
      />
    </div>

    <!-- Empty State: Channel Filter Has No Matches but Pool Has Items -->
    <div
      v-else-if="allResults.length > 0 && paginatedResults.length === 0"
      class="py-12 text-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20"
    >
      <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300 font-sans">
        当前筛选条件下未找到匹配资源
      </p>
      <p class="text-xs text-zinc-400 font-mono mt-1">
        当前关键词在其他渠道共存在 {{ allResults.length }} 条聚合实体
      </p>
      <div class="mt-4 flex items-center justify-center gap-2">
        <button
          @click="selectProvider('all')"
          class="px-3.5 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium shadow-sm hover:opacity-90 transition-opacity"
        >
          查看全部渠道 ({{ allResults.length }})
        </button>
      </div>
    </div>

    <!-- Empty State: Zero Results Across Everything -->
    <div
      v-else-if="queryInput.trim()"
      class="py-16 text-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800"
    >
      <div v-if="isDeepSearching" class="space-y-3">
        <div class="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-mono font-medium">
          <Radio class="w-4 h-4 animate-pulse text-blue-500" />
          <span>本地索引暂无收录，已自动开启全网联邦实时深度嗅探...</span>
        </div>
        <p class="text-xs text-zinc-400 font-mono">
          {{ deepSearchStatus || '正在向全网盘与磁力协议源请求实时数据' }}
        </p>
      </div>
      <div v-else class="space-y-2">
        <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300 font-sans">
          未找到与 "{{ queryInput }}" 匹配的资源
        </p>
        <p class="text-xs text-zinc-400 font-mono mt-1">
          本地索引与全网联邦节点均未匹配到相关有效资源
        </p>
        <div class="mt-4">
          <button
            @click="triggerDeepSearch"
            class="px-3.5 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono shadow-sm hover:opacity-90 transition-opacity"
          >
            再次重试全网深度检索
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination Bar (Max 50 items per page) -->
    <div
      v-if="!isLoading && totalFilteredCount > 0"
      class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 text-xs font-mono"
    >
      <div class="text-zinc-500 dark:text-zinc-400">
        <span>显示第 </span>
        <span class="font-semibold text-zinc-900 dark:text-zinc-100">
          {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, totalFilteredCount) }}
        </span>
        <span> 条，共 </span>
        <span class="font-semibold text-zinc-900 dark:text-zinc-100">{{ totalFilteredCount }}</span>
        <span> 条（页码 {{ currentPage }} / {{ totalPages }}，每页最多 50 条）</span>
      </div>

      <div v-if="totalPages > 1" class="flex items-center gap-1.5">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage <= 1"
          class="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          上一页
        </button>

        <div class="flex items-center gap-1">
          <button
            v-for="p in visiblePageNumbers"
            :key="p"
            @click="typeof p === 'number' && goToPage(p)"
            :disabled="typeof p !== 'number'"
            class="min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded text-xs transition-colors"
            :class="[
              p === currentPage
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                : typeof p === 'number'
                  ? 'border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  : 'text-zinc-400 cursor-default'
            ]"
          >
            {{ p }}
          </button>
        </div>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage >= totalPages"
          class="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- Resource Detail Drawer -->
    <ResourceDrawer
      :open="isDrawerOpen"
      :is-open="isDrawerOpen"
      :resource="selectedResource"
      @close="isDrawerOpen = false"
    />
  </div>
</template>
