<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Source } from '~/shared/types'
import { Server, Activity, ShieldAlert, CheckCircle2, Zap, RefreshCw } from 'lucide-vue-next'

const sources = ref<Source[]>([])
const isLoading = ref(true)

async function fetchSources() {
  isLoading.value = true
  try {
    const data = await $fetch<any>('/api/v1/sources')
    sources.value = data || []
  } catch {
    sources.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchSources()
})

const healthyCount = computed(() => sources.value.filter(s => s.circuitState === 'closed').length)
const avgLatency = computed(() => {
  if (sources.value.length === 0) return 0
  const total = sources.value.reduce((acc, s) => acc + (s.avgLatency || 0), 0)
  return Math.round(total / sources.value.length)
})
</script>

<template>
  <div class="space-y-6 font-mono">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          联邦数据源大盘
        </h1>
        <p class="text-xs text-zinc-500 font-sans mt-0.5">
          分布式节点健康度监测、平均延迟跟踪与自动熔断状态
        </p>
      </div>
      <button
        @click="fetchSources"
        class="flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono"
      >
        <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': isLoading }" />
        <span>刷新状态</span>
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div class="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
        <span class="text-zinc-400 block text-[11px]">总注册节点</span>
        <span class="text-lg font-bold text-zinc-900 dark:text-zinc-100">{{ sources.length }}</span>
      </div>
      <div class="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
        <span class="text-zinc-400 block text-[11px]">健康运转源</span>
        <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ healthyCount }} / {{ sources.length }}</span>
      </div>
      <div class="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
        <span class="text-zinc-400 block text-[11px]">平均网络时延</span>
        <span class="text-lg font-bold text-zinc-900 dark:text-zinc-100">{{ avgLatency }} ms</span>
      </div>
      <div class="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
        <span class="text-zinc-400 block text-[11px]">熔断隔离机制</span>
        <span class="text-lg font-bold text-blue-600 dark:text-blue-400">动态 Closed/Open</span>
      </div>
    </div>

    <!-- Source Table -->
    <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400 text-[11px] uppercase">
              <th class="py-2.5 px-4 font-medium">数据源名称 / Key</th>
              <th class="py-2.5 px-4 font-medium">协议类型</th>
              <th class="py-2.5 px-4 font-medium">优先级</th>
              <th class="py-2.5 px-4 font-medium">平均时延</th>
              <th class="py-2.5 px-4 font-medium">健康评分</th>
              <th class="py-2.5 px-4 font-medium">熔断状态</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            <tr
              v-for="s in sources"
              :key="s.id"
              class="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
            >
              <td class="py-3 px-4">
                <div class="font-medium text-zinc-900 dark:text-zinc-100 font-sans">{{ s.name }}</div>
                <div class="text-[11px] text-zinc-400 font-mono">{{ s.sourceKey }}</div>
              </td>
              <td class="py-3 px-4 uppercase text-zinc-600 dark:text-zinc-400">
                <span class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  {{ s.type }}
                </span>
              </td>
              <td class="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                P{{ s.priority >= 90 ? '0' : s.priority >= 70 ? '1' : '2' }} ({{ s.priority }})
              </td>
              <td class="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                {{ s.avgLatency || 150 }} ms
              </td>
              <td class="py-3 px-4">
                <span class="font-semibold text-emerald-600 dark:text-emerald-400">
                  {{ ((s.healthScore || 1) * 100).toFixed(1) }}%
                </span>
              </td>
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                  :class="[
                    s.circuitState === 'closed'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : s.circuitState === 'half_open'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                  ]"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="s.circuitState === 'closed' ? 'bg-emerald-500' : 'bg-rose-500'"
                  />
                  <span>{{ s.circuitState.toUpperCase() }}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
