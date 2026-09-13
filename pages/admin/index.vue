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

const isAuthed = ref(false)
const authChecking = ref(true)
const loginToken = ref('')
const loginError = ref('')
const isLoggingIn = ref(false)

const activeTab = ref<'sources' | 'analytics' | 'blacklist' | 'deadletter'>((route.query.tab as any) || 'sources')
const failedJobs = ref<any[]>([])

// Source Data
type AdminSource = Source & { liveSearch?: boolean; liveCrawl?: boolean; lastCrawlAt?: number | null }
const sources = ref<AdminSource[]>([])
const isSourcesLoading = ref(false)

// Admin Overview Data
const zeroResultQueries = ref<any[]>([])
const blacklist = ref<any[]>([])
const hotKeywords = ref<string[]>([])
const isCrawlingTrending = ref(false)
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
      failedJobs.value = res.failedJobs || []
      hotKeywords.value = res.hotKeywords || []
    }
  } catch {
    error('加载运营数据失败')
  }
}

async function crawlTrending() {
  isCrawlingTrending.value = true
  try {
    const res = await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'crawl_trending' }
    })
    if (res?.success) {
      success(`热门影视同步完成！新增与更新 ${res.totalIndexed || 0} 条索引`)
      fetchSources()
    } else {
      error('同步热门影视失败')
    }
  } catch {
    error('调度热门影视同步请求异常')
  } finally {
    isCrawlingTrending.value = false
  }
}

async function checkAuth() {
  authChecking.value = true
  try {
    await $fetch('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'get_overview' }
    })
    isAuthed.value = true
    await Promise.all([fetchSources(), loadAdminData()])
  } catch {
    isAuthed.value = false
  } finally {
    authChecking.value = false
  }
}

async function login() {
  loginError.value = ''
  isLoggingIn.value = true
  try {
    await $fetch('/api/v1/admin/login', {
      method: 'POST',
      body: { token: loginToken.value.trim() }
    })
    loginToken.value = ''
    isAuthed.value = true
    await Promise.all([fetchSources(), loadAdminData()])
    success('已进入管理控制台')
  } catch {
    loginError.value = '令牌不正确'
    error('登录失败')
  } finally {
    isLoggingIn.value = false
  }
}

async function logout() {
  await $fetch('/api/v1/admin/logout', { method: 'POST' })
  isAuthed.value = false
}

onMounted(() => {
  checkAuth()
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

async function retryFailedJob(id: number) {
  try {
    const res = await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'retry_failed_job', id }
    })
    if (res?.success) {
      success('死信任务已重试执行完毕')
      loadAdminData()
      fetchSources()
    } else {
      error(res?.error || '重试执行失败')
    }
  } catch {
    error('重试死信任务请求异常')
  }
}

async function deleteFailedJob(id: number) {
  try {
    await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'delete_failed_job', id }
    })
    success('已移除该条死信记录')
    loadAdminData()
  } catch {
    error('移除死信记录失败')
  }
}

async function clearAllFailedJobs() {
  try {
    await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'clear_failed_jobs' }
    })
    success('已清空全部死信任务')
    loadAdminData()
  } catch {
    error('清空死信任务失败')
  }
}
</script>

<template>
  <div v-if="authChecking" class="py-16 text-center text-sm text-zinc-500 font-mono">
    正在校验管理会话...
  </div>

  <form
    v-else-if="!isAuthed"
    class="max-w-md mx-auto mt-12 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-4"
    @submit.prevent="login"
  >
    <h1 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">管理控制台登录</h1>
    <p class="text-xs text-zinc-500">使用环境变量 METASEEK_ADMIN_TOKEN。本地开发可在 .env 中设置该值。</p>
    <input
      v-model="loginToken"
      type="password"
      autocomplete="current-password"
      class="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm"
      placeholder="Admin token"
    />
    <p v-if="loginError" class="text-xs text-rose-500">{{ loginError }}</p>
    <button
      type="submit"
      :disabled="isLoggingIn || !loginToken.trim()"
      class="w-full py-2 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm disabled:opacity-50"
    >
      {{ isLoggingIn ? '登录中...' : '登录' }}
    </button>
  </form>

  <div v-else class="space-y-6 font-mono text-xs">
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
        <button
          type="button"
          class="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
          @click="logout"
        >
          退出
        </button>
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

      <button
        @click="activeTab = 'deadletter'"
        class="px-3 py-1.5 rounded-md font-mono transition-colors flex items-center gap-1.5"
        :class="[
          activeTab === 'deadletter'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
        ]"
      >
        <ShieldAlert class="w-3.5 h-3.5 text-amber-500" />
        <span>死信队列 ({{ failedJobs.length }})</span>
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

      <!-- Hot Trending Movies Seed Sync Banner -->
      <div class="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Zap class="w-4 h-4 text-emerald-500" />
            <span class="text-zinc-800 dark:text-zinc-200 font-semibold">全网影视热榜种子驱动 (Trending-as-Seeds)</span>
            <span class="text-zinc-400 text-[11px]">从豆瓣实时热播榜自动发现片名，触发全网爬取沉淀索引</span>
          </div>
          <button
            @click="crawlTrending"
            :disabled="isCrawlingTrending"
            class="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': isCrawlingTrending }" />
            <span>{{ isCrawlingTrending ? '正在全网检索建库...' : '同步热搜并建索引' }}</span>
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5 pt-1">
          <span
            v-for="kw in hotKeywords"
            :key="kw"
            class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-[11px] font-sans"
          >
            {{ kw }}
          </span>
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
            @click="runSourceCrawl('all')"
            class="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            全量采集
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
                  <div class="mt-1 flex gap-1">
                    <span v-if="s.liveSearch || s.liveCrawl" class="px-1 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px]">真实入口</span>
                    <span v-else class="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px]">未配置</span>
                  </div>
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
                      :disabled="!s.liveCrawl"
                      class="px-2 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity text-[11px] disabled:opacity-40"
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

        <div v-if="failedJobs.length" class="rounded border border-zinc-200 dark:border-zinc-800 p-3 space-y-1">
          <div class="text-[11px] text-zinc-400">失败任务 / Dead Letter（最近 {{ failedJobs.length }} 条）</div>
          <div v-for="job in failedJobs" :key="job.id" class="flex justify-between gap-2">
            <span>{{ job.source_key }}</span>
            <span class="text-rose-500 truncate">{{ job.error }}</span>
          </div>
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

    <!-- TAB 4: 死信队列与调度失败任务 -->
    <div v-if="activeTab === 'deadletter'" class="space-y-6">
      <div class="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <ShieldAlert class="w-4 h-4 text-amber-500" />
              <span>死信任务队列 (Dead Letter Queue & Failed Crawl Jobs)</span>
            </h2>
            <span class="text-zinc-400 text-[11px]">爬虫与调度重试 3 次均失败的任务沉淀于此，可排查错误并手动重试</span>
          </div>

          <button
            v-if="failedJobs.length > 0"
            @click="clearAllFailedJobs"
            class="px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs transition-colors"
          >
            清空全部死信
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="job in failedJobs"
            :key="job.id"
            class="p-3 rounded border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                  Job #{{ job.id }}
                </span>
                <span class="font-semibold text-zinc-800 dark:text-zinc-200">{{ job.source_key }}</span>
                <span class="text-zinc-400 text-[11px]">{{ job.created_at ? new Date(job.created_at).toLocaleString() : '' }}</span>
              </div>
              <p class="text-xs text-rose-600 dark:text-rose-400 font-mono">
                {{ job.error }}
              </p>
              <p v-if="job.payload" class="text-[11px] text-zinc-400 font-mono truncate max-w-xl">
                载荷: {{ job.payload }}
              </p>
            </div>

            <div class="flex items-center gap-2 self-end sm:self-center">
              <button
                @click="retryFailedJob(job.id)"
                class="px-2.5 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity text-xs flex items-center gap-1"
              >
                <RotateCcw class="w-3 h-3" />
                <span>立即重试</span>
              </button>
              <button
                @click="deleteFailedJob(job.id)"
                class="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                title="删除记录"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="failedJobs.length === 0" class="py-8 text-center text-zinc-400 text-xs">
            暂无死信任务，所有后台采集与队列任务运行健康
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
