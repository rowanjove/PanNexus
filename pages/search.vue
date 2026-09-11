<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CanonicalResource, Resource, ResourceType, Provider } from '~/shared/types'
import ResourceCard from '~/components/ResourceCard.vue'
import ResourceDrawer from '~/components/ResourceDrawer.vue'
import { Search, SlidersHorizontal, RefreshCw, Radio, Layers, AlertCircle, ArrowUpDown } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const queryInput = ref(String(route.query.q || ''))
const searchResults = ref<CanonicalResource[]>([])
const totalCount = ref(0)
const latencyMs = ref(0)
const isLoading = ref(false)

// Filters
const filterType = ref<ResourceType | 'all'>((route.query.type as any) || 'all')
const filterProvider = ref<Provider | 'all'>((route.query.provider as any) || 'all')
const filterResolution = ref<string>((route.query.resolution as any) || 'all')
const filterSort = ref<'rank' | 'freshness' | 'size_desc'>('rank')

// Deep Search (SSE) state
const isDeepSearching = ref(false)
const deepSearchStatus = ref('')
const deepSearchNewCount = ref(0)

// Drawer state
const selectedResource = ref<Resource | null>(null)
const isDrawerOpen = ref(false)

async function fetchResults() {
  const q = queryInput.value.trim()
  if (!q) {
    searchResults.value = []
    totalCount.value = 0
    return
  }

  isLoading.value = true
  try {
    const params: Record<string, string> = {
      q,
      type: filterType.value,
      provider: filterProvider.value,
      sort: filterSort.value
    }
    if (filterResolution.value !== 'all') {
      params.resolution = filterResolution.value
    }

    const data = await $fetch<any>('/api/v1/search', { params })
    searchResults.value = data?.items || []
    totalCount.value = data?.total || 0
    latencyMs.value = data?.latencyMs || 0
  } catch (err) {
    searchResults.value = []
    totalCount.value = 0
  } finally {
    isLoading.value = false
  }
}

function handleSearchSubmit() {
  router.push({
    path: '/search',
    query: {
      q: queryInput.value.trim(),
      ...(filterType.value !== 'all' ? { type: filterType.value } : {}),
      ...(filterProvider.value !== 'all' ? { provider: filterProvider.value } : {}),
      ...(filterResolution.value !== 'all' ? { resolution: filterResolution.value } : {})
    }
  })
}

// Watch query changes in route
watch(
  () => route.query,
  () => {
    queryInput.value = String(route.query.q || '')
    filterType.value = (route.query.type as any) || 'all'
    filterProvider.value = (route.query.provider as any) || 'all'
    filterResolution.value = (route.query.resolution as any) || 'all'
    fetchResults()
  },
  { immediate: true }
)

// Watch filter changes
watch([filterType, filterProvider, filterResolution, filterSort], () => {
  fetchResults()
})

// Trigger Deep Search via SSE
function triggerDeepSearch() {
  const q = queryInput.value.trim()
  if (!q || isDeepSearching.value) return

  isDeepSearching.value = true
  deepSearchStatus.value = '正在向联邦节点发起实时检索...'
  deepSearchNewCount.value = 0

  const eventSource = new EventSource(`/api/v1/search/live?q=${encodeURIComponent(q)}`)

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

      // Merge into search results
      const incomingRes = data.rawResource
      const canon = data.canonical

      const existingIndex = searchResults.value.findIndex(c => c.id === canon.id)
      if (existingIndex >= 0) {
        const existing = searchResults.value[existingIndex]
        existing.resources = existing.resources || []
        existing.resources.push(incomingRes)
        existing.sourceCount = existing.resources.length
      } else {
        searchResults.value.push({
          ...canon,
          resources: [incomingRes],
          sourceCount: 1,
          providerCounts: { [incomingRes.provider]: 1 } as any,
          maxSizeBytes: incomingRes.size
        })
      }
      totalCount.value = searchResults.value.length
    } catch {}
  })

  eventSource.addEventListener('complete', () => {
    deepSearchStatus.value = `深度搜索完成，累计获取 ${deepSearchNewCount.value} 条补充结果`
    isDeepSearching.value = false
    eventSource.close()
  })

  eventSource.addEventListener('error', () => {
    isDeepSearching.value = false
    eventSource.close()
  })
}

function openInspect(resource: Resource) {
  selectedResource.value = resource
  isDrawerOpen.value = true
}

const providersList: { label: string; value: Provider | 'all' }[] = [
  { label: '全部来源', value: 'all' },
  { label: '夸克', value: 'quark' },
  { label: '百度', value: 'baidu' },
  { label: '阿里', value: 'aliyun' },
  { label: '115', value: '115' },
  { label: '123云盘', value: '123pan' },
  { label: '磁力', value: 'magnet' },
  { label: '种子', value: 'torrent' }
]

const resolutionsList = [
  { label: '全部画质', value: 'all' },
  { label: '4K/2160p', value: '2160p' },
  { label: '1080p', value: '1080p' },
  { label: '720p', value: '720p' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Top Search Bar & Actions -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <form
        @submit.prevent="handleSearchSubmit"
        class="flex-1 relative flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111114] shadow-sm focus-within:border-zinc-900 dark:focus-within:border-zinc-100"
      >
        <div class="pl-3 pr-2 text-zinc-400">
          <Search class="w-4 h-4" />
        </div>
        <input
          id="global-search-input"
          v-model="queryInput"
          type="text"
          placeholder="搜索资源..."
          class="w-full py-2.5 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
        />
        <button
          type="submit"
          class="m-1 px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-mono text-xs font-medium"
        >
          搜索
        </button>
      </form>

      <!-- Deep Search Action Button -->
      <button
        @click="triggerDeepSearch"
        :disabled="isDeepSearching || !queryInput.trim()"
        class="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        title="向远程数据源发起实时嗅探并补全索引"
      >
        <Radio class="w-3.5 h-3.5" :class="{ 'animate-pulse text-red-500': isDeepSearching }" />
        <span>{{ isDeepSearching ? '正在深度搜索...' : '深度搜索 (Live Search)' }}</span>
      </button>
    </div>

    <!-- Filter Bar (Minimalist Segmented Controls) -->
    <div class="p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-2.5 text-xs font-mono">
      <!-- Provider Filter -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-zinc-400 dark:text-zinc-500 w-16 shrink-0">存储渠道:</span>
        <button
          v-for="p in providersList"
          :key="p.value"
          @click="filterProvider = p.value"
          class="px-2 py-0.5 rounded transition-colors"
          :class="[
            filterProvider === p.value
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          ]"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Resolution & Sort Filter -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-zinc-400 dark:text-zinc-500 w-16 shrink-0">画质规格:</span>
          <button
            v-for="r in resolutionsList"
            :key="r.value"
            @click="filterResolution = r.value"
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
            <option value="freshness">最新发现 (Freshness)</option>
            <option value="size_desc">体积从大到小</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Live Search SSE Banner (If active) -->
    <div
      v-if="isDeepSearching || deepSearchStatus"
      class="flex items-center justify-between p-2.5 rounded-md bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
    >
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500" :class="{ 'animate-ping': isDeepSearching }" />
        <span class="text-zinc-700 dark:text-zinc-300">{{ deepSearchStatus }}</span>
      </div>
      <span v-if="deepSearchNewCount > 0" class="font-semibold text-emerald-600 dark:text-emerald-400">
        +{{ deepSearchNewCount }} 项新增
      </span>
    </div>

    <!-- Search Stats Line -->
    <div class="flex items-center justify-between text-xs font-mono text-zinc-500 px-1">
      <div class="flex items-center gap-2">
        <span>命中 <strong class="text-zinc-800 dark:text-zinc-200">{{ totalCount }}</strong> 个聚合实体</span>
        <span>·</span>
        <span>耗时 {{ latencyMs }}ms</span>
      </div>
      <span class="text-zinc-400">本地 FTS5 预索引</span>
    </div>

    <!-- Search Results Flow (Canonical Cards) -->
    <div v-if="isLoading" class="space-y-4 py-8 text-center font-mono text-xs text-zinc-400">
      <div class="inline-block w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mb-2" />
      <div>检索本地索引中...</div>
    </div>

    <div v-else-if="searchResults.length > 0" class="space-y-3">
      <ResourceCard
        v-for="canonical in searchResults"
        :key="canonical.id"
        :canonical="canonical"
        @inspect="openInspect"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="queryInput.trim()"
      class="text-center py-16 px-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-[#111114]/40"
    >
      <AlertCircle class="w-8 h-8 text-zinc-400 mx-auto mb-3" />
      <h3 class="text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200 mb-1">
        未找到匹配的本地索引
      </h3>
      <p class="text-xs text-zinc-500 max-w-sm mx-auto mb-4 font-sans">
        未命中当前本地数据库，可点击下方按钮向远程节点发起深度搜索，结果将实时增量呈现并自动沉淀至索引库。
      </p>
      <button
        @click="triggerDeepSearch"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-medium"
      >
        <Radio class="w-3.5 h-3.5" />
        <span>触发深度实时检索</span>
      </button>
    </div>

    <!-- Resource Detail Drawer -->
    <ResourceDrawer
      :open="isDrawerOpen"
      :resource="selectedResource"
      @close="isDrawerOpen = false"
    />
  </div>
</template>
