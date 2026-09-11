<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '~/composables/useToast'
import { Shield, Play, RotateCcw, AlertTriangle, Search, Ban, CheckCircle2 } from 'lucide-vue-next'

const { success } = useToast()

const zeroResultQueries = ref([
  { query: '三体 4K 60帧 未删减', count: 42, lastSearched: '10分钟前' },
  { query: 'GTA6 PC 破解版', count: 38, lastSearched: '35分钟前' },
  { query: '现代操作系统 第五版 中文 pdf', count: 21, lastSearched: '1小时前' },
  { query: 'Final Cut Pro 11 破解', count: 18, lastSearched: '2小时前' }
])

const blacklist = ref([
  { type: 'domain', value: 'spam-ad-site.com', addedAt: '2025-01-10' },
  { type: 'infohash', value: '0000000000000000000000000000000000000000', addedAt: '2025-01-12' }
])

const newBlacklistVal = ref('')

function runSourceCrawl(sourceKey: string) {
  success(`已为 [${sourceKey}] 下发异步采集任务至 Cloudflare Queues`)
}

function resetCircuit(sourceKey: string) {
  success(`已重置 [${sourceKey}] 熔断状态为 CLOSED`)
}

function addBlacklist() {
  if (!newBlacklistVal.value.trim()) return
  blacklist.value.push({
    type: 'keyword/hash',
    value: newBlacklistVal.value.trim(),
    addedAt: '刚刚'
  })
  newBlacklistVal.value = ''
  success('已添加至屏蔽黑名单')
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
          </div>
          <span class="text-zinc-400 text-[11px]">{{ b.addedAt }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
