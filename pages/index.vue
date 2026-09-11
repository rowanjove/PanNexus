<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, ArrowRight, ShieldCheck, Database, Zap } from 'lucide-vue-next'
import type { ResourceType } from '~/shared/types'

const router = useRouter()
const searchKeyword = ref('')
const selectedType = ref<ResourceType | 'all'>('all')

const trendingKeywords = ref([
  '流浪地球2',
  '奥本海默',
  '黑神话悟空',
  '沙丘2',
  '繁花',
  'Photoshop 2024',
  'VSCode 便携版',
  '星际穿越'
])

const stats = ref({
  totalResources: 18420,
  totalCanonical: 4920,
  healthySources: 8
})

onMounted(async () => {
  try {
    const data = await $fetch<any>('/api/v1/trending')
    if (data?.trending) trendingKeywords.value = data.trending
    if (data?.stats) stats.value = data.stats
  } catch {
    // Keep defaults
  }

  // Keyboard shortcut '/' to focus search input
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault()
      document.getElementById('global-search-input')?.focus()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
})

function handleSearch(keyword = searchKeyword.value) {
  const q = keyword.trim()
  if (!q) return

  router.push({
    path: '/search',
    query: {
      q,
      ...(selectedType.value !== 'all' ? { type: selectedType.value } : {})
    }
  })
}

const typeTabs: { label: string; value: ResourceType | 'all' }[] = [
  { label: '全部资源', value: 'all' },
  { label: '网盘分享', value: 'cloud_drive' },
  { label: '磁力链接', value: 'magnet' },
  { label: '种子文件', value: 'torrent' },
  { label: '常用软件', value: 'other' }
]
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[72vh] px-2">
    <!-- Clean Minimalist Header & Tagline -->
    <div class="text-center max-w-xl mx-auto mb-8">
      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 font-mono text-xs mb-4">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Cloudflare Workers + D1 FTS5 Native</span>
      </div>

      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
        联邦资源索引
      </h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 font-sans leading-relaxed">
        多源采集 · 标准化去重 · 实体聚合聚类 · 本地索引极速检索
      </p>
    </div>

    <!-- Search Input Box (High Ergonomics, Anti-AI Vibe) -->
    <div class="w-full max-w-2xl mx-auto">
      <form
        @submit.prevent="handleSearch()"
        class="relative flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111114] shadow-sm transition-all focus-within:border-zinc-900 dark:focus-within:border-zinc-100 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100"
      >
        <div class="pl-4 pr-2 text-zinc-400">
          <Search class="w-5 h-5" />
        </div>

        <input
          id="global-search-input"
          v-model="searchKeyword"
          type="text"
          autocomplete="off"
          placeholder="搜索影视、软件、资料、磁力（按 / 快速聚焦）..."
          class="w-full py-3.5 bg-transparent text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none"
        />

        <div class="pr-2 flex items-center gap-2">
          <button
            type="submit"
            class="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-mono font-medium transition-colors flex items-center gap-1 shrink-0"
          >
            <span>检索</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      <!-- Category Filter Tabs -->
      <div class="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 overflow-x-auto py-1">
        <button
          v-for="tab in typeTabs"
          :key="tab.value"
          @click="selectedType = tab.value"
          class="px-3 py-1 rounded-md text-xs font-mono transition-colors shrink-0"
          :class="[
            selectedType === tab.value
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Trending Queries -->
      <div class="mt-8 pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span class="text-zinc-400 dark:text-zinc-500 font-mono mr-1">热门索引:</span>
        <button
          v-for="kw in trendingKeywords"
          :key="kw"
          @click="handleSearch(kw)"
          class="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 transition-colors font-mono"
        >
          {{ kw }}
        </button>
      </div>

      <!-- Platform Features Ticker -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 pt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 text-xs font-mono text-zinc-500">
        <div class="flex items-center gap-2 p-3 rounded border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-[#111114]/60">
          <Database class="w-4 h-4 text-zinc-400 shrink-0" />
          <span>本地预索引优先 (P50 &lt; 80ms)</span>
        </div>
        <div class="flex items-center gap-2 p-3 rounded border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-[#111114]/60">
          <ShieldCheck class="w-4 h-4 text-zinc-400 shrink-0" />
          <span>8 节点独立熔断与健康管理</span>
        </div>
        <div class="flex items-center gap-2 p-3 rounded border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-[#111114]/60">
          <Zap class="w-4 h-4 text-zinc-400 shrink-0" />
          <span>Canonical 多版本自动聚类</span>
        </div>
      </div>
    </div>
  </div>
</template>
