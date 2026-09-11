<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '~/composables/useToast'
import type { Source } from '~/shared/types'
import {
  Shield,
  Play,
  RotateCcw,
  Search,
  Ban,
  CheckCircle2,
  Trash2,
  Server,
  Activity,
  RefreshCw,
  Zap,
  ShieldAlert
} from 'lucide-vue-next'

const route = useRoute()
const { success, error } = useToast()

const activeTab = ref<'sources' | 'analytics' | 'blacklist'>((route.query.tab as any) || 'sources')

// Source Data
const sources = ref<Source[]>([])
const isSourcesLoading = ref(false)

// Admin Overview Data
const zeroResultQueries = ref<any[]>([])
const blacklist = ref<any[]>([])
const newBlacklistVal = ref('')
const newBlacklistType = ref('keyword')

async function fetchSources() {
  isSourcesLoading.value = true
  try {
    const data = await $fetch<any>('/api/v1/sources')
    sources.value = data || []
  } catch {
    sources.value = []
  } finally {
    isSourcesLoading.value = false
  }
}

async function loadAdminData() {
  try {
    const res = await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'get_overview' }
    })
    if (res?.success) {
      zeroResultQueries.value = res.zeroResults || []
      blacklist.value = res.blockedItems || []
    }
  } catch {
    error('加载运营数据失败')
  }
}

onMounted(() => {
  fetchSources()
  loadAdminData()
})

const healthyCount = computed(() => sources.value.filter(s => s.circuitState === 'closed').length)
const avgLatency = computed(() => {
  if (sources.value.length === 0) return 0
  const total = sources.value.reduce((acc, s) => acc + (s.avgLatency || 0), 0)
  return Math.round(total / sources.value.length)
})

async function runSourceCrawl(sourceKey: string) {
  try {
    const res = await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'trigger_crawl', sourceId: sourceKey }
    })
    success(`已调度 [${sourceKey}] 采集，本次抓取/新增 ${res.inserted || 0} 条索引`)
  } catch {
    error(`调度 [${sourceKey}] 采集失败`)
  }
}

async function resetCircuit(sourceKey: string) {
  try {
    await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'reset_circuit', sourceId: sourceKey }
    })
    success(`已重置 [${sourceKey}] 熔断状态为 CLOSED`)
    fetchSources()
  } catch {
    error('重置熔断状态失败')
  }
}

async function addBlacklist() {
  const val = newBlacklistVal.value.trim()
  if (!val) return

  try {
    await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'add_blocked', type: newBlacklistType.value, value: val }
    })
    success('已成功添加至屏蔽库')
    newBlacklistVal.value = ''
    loadAdminData()
  } catch {
    error('添加屏蔽失败')
  }
}

async function removeBlacklist(id: number) {
  try {
    await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'remove_blocked', id }
    })
    success('已解除屏蔽')
    loadAdminData()
  } catch {
    error('解除屏蔽失败')
  }
}
</script>

<template>
  <div class="space-y-6 font-mono text-xs">
    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Shield class="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          <span>MetaSeek 运营与管理控制台</span>
        </h1>
        <p class="text-xs text-zinc-500 font-sans mt-0.5">
          联邦数据源大盘、分布式调度、零结果监控与合规治理
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span class="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          Admin Session: Active
        </span>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
      <button
        @click="activeTab = 'sources'"
        class="px-3 py-1.5 rounded-md font-mono transition-colors flex items-center gap-1.5"
        :class="[
          activeTab === 'sources'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
        ]"
      >
        <Server class="w-3.5 h-3.5" />
        <span>数据源大盘 ({{ sources.length }})</span>
      </button>

      <button
        @click="activeTab = 'analytics'"
        class="px-3 py-1.5 rounded-md font-mono transition-colors flex items-center gap-1.5"
        :class="[
          activeTab === 'analytics'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
        ]"
      >
        <Search class="w-3.5 h-3.5" />
        <span>零结果监控 ({{ zeroResultQueries.length }})</span>
      </button>

      <button
        @click="activeTab = 'blacklist'"
        class="px-3 py-1.5 rounded-md font-mono transition-colors flex items-center gap-1.5"
        :class="[
          activeTab === 'blacklist'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
        ]"
      >
        <Ban class="w-3.5 h-3.5" />
        <span>合规黑名单 ({{ blacklist.length }})</span>
      </button>
    </div>

    <!-- TAB 1: 数据源大盘 -->
    <div v-if="activeTab === 'sources'" class="space-y-6">
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

      <!-- Quick Global Circuit Reset -->
      <div class="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <RotateCcw class="w-4 h-4 text-amber-500" />
          <span class="text-zinc-800 dark:text-zinc-200 font-medium">全局熔断器状态重置</span>
          <span class="text-zinc-400 text-[11px]">(将所有节点恢复为可用态)</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="fetchSources"
            class="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': isSourcesLoading }" />
            <span>刷新</span>
          </button>
          <button
            @click="resetCircuit('all')"
            class="px-2.5 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity font-medium"
          >
            强制全局重置
          </button>
        </div>
      </div>

      <!-- Sources Table with Action Buttons -->
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
                <th class="py-2.5 px-4 font-medium text-right">运维操作</th>
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
                  {{ s.priority }}
                </td>
                <td class="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                  {{ s.avgLatency || 0 }}ms
                </td>
                <td class="py-3 px-4">
                  <span
                    class="font-semibold"
                    :class="[
                      (s.healthScore || 1) >= 0.9 ? 'text-emerald-600 dark:text-emerald-400' :
                      (s.healthScore || 1) >= 0.7 ? 'text-amber-500' : 'text-rose-500'
                    ]"
                  >
                    {{ Math.round((s.healthScore || 1) * 100) }}%
                  </span>
                </td>
                <td class="py-3 px-4">
                  <span
                    v-if="s.circuitState === 'closed'"
                    class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    <span>CLOSED (正常)</span>
                  </span>
                  <span
                    v-else-if="s.circuitState === 'half_open'"
                    class="inline-flex items-center gap-1 text-amber-500"
                  >
                    <Zap class="w-3.5 h-3.5" />
                    <span>HALF_OPEN (试探)</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 text-rose-500"
                  >
                    <ShieldAlert class="w-3.5 h-3.5" />
                    <span>OPEN (已熔断)</span>
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="inline-flex items-center gap-1.5">
                    <button
                      @click="runSourceCrawl(s.sourceKey)"
                      class="px-2 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity text-[11px]"
                      title="下发爬虫任务"
                    >
                      立即采集
                    </button>
                    <button
                      @click="resetCircuit(s.sourceKey)"
                      class="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-[11px]"
                      title="重置熔断器"
                    >
                      重置
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: 零结果检索监控 -->
    <div v-else-if="activeTab === 'analytics'" class="space-y-4">
      <div class="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Search class="w-4 h-4 text-blue-500" />
            <span>零结果搜索词监控 (Zero Result Queries)</span>
          </h2>
          <span class="text-zinc-400 text-[11px]">高频未命中词将自动记录，指导扩充对应垂直 Source</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 text-[11px]">
                <th class="py-2 font-medium">搜索关键词</th>
                <th class="py-2 font-medium">未命中次数</th>
                <th class="py-2 font-medium">最后检索时间</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <tr v-for="q in zeroResultQueries" :key="q.query" class="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                <td class="py-2 text-zinc-900 dark:text-zinc-100 font-medium font-sans">{{ q.query }}</td>
                <td class="py-2 text-rose-600 dark:text-rose-400 font-bold">{{ q.count }} 次</td>
                <td class="py-2 text-zinc-400">{{ q.lastSearched }}</td>
              </tr>
              <tr v-if="zeroResultQueries.length === 0">
                <td colspan="3" class="py-6 text-center text-zinc-400">
                  暂无零结果记录
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: 合规治理与黑名单 -->
    <div v-else-if="activeTab === 'blacklist'" class="space-y-4">
      <div class="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Ban class="w-4 h-4 text-rose-500" />
            <span>合规治理与黑名单库 (Blacklist & Filtering)</span>
          </h2>
          <span class="text-zinc-400 text-[11px]">屏蔽项在搜索和采集入库时均会被静默拦截</span>
        </div>

        <!-- Add Blacklist Form -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            v-model="newBlacklistType"
            class="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="keyword">关键词 (Keyword)</option>
            <option value="domain">垃圾域名 (Domain)</option>
            <option value="infohash">违规 BTIH (InfoHash)</option>
          </select>
          <input
            v-model="newBlacklistVal"
            @keyup.enter="addBlacklist"
            type="text"
            placeholder="输入要屏蔽的域名、关键词或 40 位 infohash..."
            class="flex-1 px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          <button
            @click="addBlacklist"
            class="px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity shrink-0"
          >
            添加屏蔽
          </button>
        </div>

        <!-- Blacklist List -->
        <div class="space-y-1.5">
          <div
            v-for="b in blacklist"
            :key="b.id || b.value"
            class="flex items-center justify-between p-2 rounded border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
          >
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400">
                {{ b.type }}
              </span>
              <span class="text-zinc-800 dark:text-zinc-200">{{ b.value }}</span>
              <span v-if="b.reason" class="text-zinc-400 text-[11px]">({{ b.reason }})</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-zinc-400 text-[11px]">{{ b.created_at ? new Date(b.created_at).toLocaleDateString() : (b.addedAt || '近期') }}</span>
              <button
                v-if="b.id"
                @click="removeBlacklist(b.id)"
                class="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                title="解除屏蔽"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div v-if="blacklist.length === 0" class="py-6 text-center text-zinc-400">
            黑名单库为空
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
