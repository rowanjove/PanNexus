<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CanonicalResource, Resource, ResourceType, Provider } from '~/shared/types'
import ResourceCard from '~/components/ResourceCard.vue'
import ResourceDrawer from '~/components/ResourceDrawer.vue'
import { Search, Radio, Check } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const queryInput = ref(String(route.query.q || ''))
const searchResults = ref<CanonicalResource[]>([])
const totalCount = ref(0)
const latencyMs = ref(0)
const isLoading = ref(false)

const typeOptions: { label: string; value: ResourceType }[] = [
  { label: '网盘分享', value: 'cloud_drive' },
  { label: '磁力链接', value: 'magnet' },
  { label: '种子文件', value: 'torrent' },
  { label: '软件/资料', value: 'other' }
]

// Multi-select type filter state
const selectedTypes = ref<ResourceType[]>(['cloud_drive', 'magnet', 'torrent', 'other'])

const isAllSelected = computed(() => selectedTypes.value.length === typeOptions.length)

function toggleAllTypes() {
  if (isAllSelected.value) {
    selectedTypes.value = []
  } else {
    selectedTypes.value = typeOptions.map(t => t.value)
  }
  handleSearchSubmit()
}

function toggleType(type: ResourceType) {
  const idx = selectedTypes.value.indexOf(type)
  if (idx >= 0) {
    selectedTypes.value.splice(idx, 1)
  } else {
    selectedTypes.value.push(type)
  }
  handleSearchSubmit()
}

// Single-choice filters
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
    const typeParam = isAllSelected.value || selectedTypes.value.length === 0
      ? 'all'
      : selectedTypes.value.join(',')

    const params: Record<string, string> = {
      q,
      type: typeParam,
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
  const typeParam = isAllSelected.value || selectedTypes.value.length === 0
    ? undefined
    : selectedTypes.value.join(',')

  router.push({
    path: '/search',
    query: {
      q: queryInput.value.trim(),
      ...(typeParam ? { type: typeParam } : {}),
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
    if (route.query.type) {
      const parsed = String(route.query.type).split(',').filter(Boolean) as ResourceType[]
      selectedTypes.value = parsed.length > 0 ? parsed : typeOptions.map(t => t.value)
    } else {
      selectedTypes.value = typeOptions.map(t => t.value)
    }
    filterProvider.value = (route.query.provider as any) || 'all'
    filterResolution.value = (route.query.resolution as any) || 'all'
    fetchResults()
  },
  { immediate: true }
)

// Watch sort and provider changes
watch([filterProvider, filterResolution, filterSort], () => {
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
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
      <form
        @submit.prevent="handleSearchSubmit"
        class="flex-1 relative flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111114] shadow-sm p-1 focus-within:border-zinc-900 dark:focus-within:border-zinc-100"
      >
        <div class="pl-3 pr-2 text-zinc-400">
          <Search class="w-4 h-4" />
        </div>
        <input
          id="global-search-input"
          v-model="queryInput"
          type="text"
          placeholder="搜索资源、影视、动漫、软件..."
          class="w-full py-2 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
        />
        <button
          type="submit"
          class="px-5 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-mono text-xs font-semibold transition-opacity flex items-center gap-1 shrink-0 shadow-sm"
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
      <!-- Type Multi-select Filter Checkbox Buttons -->
      <div class="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/60">
        <span class="text-zinc-400 dark:text-zinc-500 w-16 shrink-0">资源类型:</span>
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
        <span class="font-semibold text-zinc-900 dark:text-zinc-100">{{ totalCount }}</span>
        <span> 个聚合实体</span>
        <span v-if="latencyMs > 0" class="ml-2 text-zinc-400">(耗时 {{ latencyMs }}ms)</span>
      </div>
      <div class="text-[11px] text-zinc-400">
        本地 FTS5 聚合优先
      </div>
    </div>

    <!-- Result Cards Stream -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-28 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 animate-pulse" />
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
      class="py-16 text-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800"
    >
      <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300 font-sans">
        未找到与 "{{ queryInput }}" 匹配的资源
      </p>
      <p class="text-xs text-zinc-400 font-mono mt-1">
        已自动将该关键词写入未命中库，后台爬虫将在下一个调度周期补全索引
      </p>
      <div class="mt-4">
        <button
          @click="triggerDeepSearch"
          class="px-3.5 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono"
        >
          立即尝试实时深度搜索
        </button>
      </div>
    </div>

    <!-- Resource Detail Drawer -->
    <ResourceDrawer
      :is-open="isDrawerOpen"
      :resource="selectedResource"
      @close="isDrawerOpen = false"
    />
  </div>
</template>
