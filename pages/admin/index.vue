<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
import { Shield, Play, RotateCcw, AlertTriangle, Search, Ban, CheckCircle2, Trash2 } from 'lucide-vue-next'

const { success, error } = useToast()

const zeroResultQueries = ref<any[]>([])
const blacklist = ref<any[]>([])
const newBlacklistVal = ref('')
const newBlacklistType = ref('keyword')

async function loadData() {
  try {
    const res = await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'get_overview' }
    })
    if (res?.success) {
      zeroResultQueries.value = res.zeroResults || []
      blacklist.value = res.blockedItems || []
    }
  } catch (err: any) {
    error('加载管理数据失败')
  }
}

onMounted(() => {
  loadData()
})

async function runSourceCrawl(sourceKey: string) {
  try {
    const res = await $fetch<any>('/api/v1/admin/actions', {
      method: 'POST',
      body: { action: 'trigger_crawl', sourceId: sourceKey }
    })
    success(`已调度 [${sourceKey}] 采集，本次新增 ${res.inserted || 0} 条索引`)
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
    loadData()
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
    loadData()
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
          Cloudflare Serverless 采集任务管理、零结果检索分析与合规治理
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span class="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          Admin Session: Active
        </span>
      </div>
    </div>

    <!-- Quick Actions Panel -->
    <div class="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-3">
      <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <Play class="w-4 h-4 text-emerald-500" />
        <span>快捷数据源调度与运维操作</span>
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between">
          <div>
            <div class="font-medium text-zinc-800 dark:text-zinc-200 font-sans">网盘公开聚合</div>
            <div class="text-[11px] text-zinc-400">pan_index</div>
          </div>
          <button
            @click="runSourceCrawl('pan_index')"
            class="px-2.5 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            立即采集
          </button>
        </div>

        <div class="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between">
          <div>
            <div class="font-medium text-zinc-800 dark:text-zinc-200 font-sans">磁力与种子网络</div>
            <div class="text-[11px] text-zinc-400">magnet_index</div>
          </div>
          <button
            @click="runSourceCrawl('magnet_index')"
            class="px-2.5 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            立即采集
          </button>
        </div>

        <div class="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between">
          <div>
            <div class="font-medium text-zinc-800 dark:text-zinc-200 font-sans">全局熔断器重置</div>
            <div class="text-[11px] text-zinc-400">circuit_reset</div>
          </div>
          <button
            @click="resetCircuit('all')"
            class="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            强制重置
          </button>
        </div>
      </div>
    </div>

    <!-- Zero Results Query Analytics (PRD Section 59) -->
    <div class="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Search class="w-4 h-4 text-blue-500" />
          <span>零结果搜索词监控 (Zero Result Queries)</span>
        </h2>
        <span class="text-zinc-400 text-[11px]">指导扩充数据源接入</span>
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
          </tbody>
        </table>
      </div>
    </div>

    <!-- Blacklist / Moderation (PRD Section 123) -->
    <div class="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-3">
      <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <Ban class="w-4 h-4 text-rose-500" />
        <span>内容合规与屏蔽黑名单 (Blacklist & Moderation)</span>
      </h2>

      <div class="flex items-center gap-2">
        <input
          v-model="newBlacklistVal"
          type="text"
          placeholder="输入要屏蔽的域名、Hash 或关键词..."
          class="flex-1 py-1.5 px-3 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
        />
        <button
          @click="addBlacklist"
          class="px-3 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 transition-opacity"
        >
          添加屏蔽
        </button>
      </div>

      <div class="divide-y divide-zinc-100 dark:divide-zinc-800/60 pt-2">
        <div v-for="b in blacklist" :key="b.value" class="py-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 uppercase">
              {{ b.type }}
            </span>
            <span class="text-zinc-800 dark:text-zinc-200">{{ b.value }}</span>
            <span v-if="b.reason" class="text-zinc-400 text-[11px]">({{ b.reason }})</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-zinc-400 text-[11px]">{{ b.created_at ? new Date(b.created_at).toLocaleDateString() : b.addedAt }}</span>
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
      </div>
    </div>
  </div>
</template>
