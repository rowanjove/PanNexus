<script setup lang="ts">
import { ref } from 'vue'
import type { CanonicalResource, Resource, Provider } from '~/shared/types'
import { useCopy } from '~/composables/useCopy'
import { ExternalLink, Copy, Key, HardDrive, FileText, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-vue-next'

const props = defineProps<{
  canonical: CanonicalResource
}>()

const emit = defineEmits<{
  (e: 'inspect', resource: Resource): void
}>()

const isExpanded = ref(false)
const { copyToClipboard } = useCopy()

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '--'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatTimeAgo(ts?: number | null): string {
  if (!ts) return ''
  const diffHours = Math.round((Date.now() - ts) / (3600 * 1000))
  if (diffHours < 1) return '刚刚'
  if (diffHours < 24) return `${diffHours}小时前`
  const days = Math.round(diffHours / 24)
  return `${days}天前`
}

function getProviderBadgeClass(provider: Provider): string {
  switch (provider) {
    case 'magnet':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'quark':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    case 'baidu':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'aliyun':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case '115':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    case '123pan':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'torrent':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    default:
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
  }
}

function getProviderName(provider: Provider): string {
  const map: Record<string, string> = {
    magnet: 'Magnet',
    quark: '夸克网盘',
    baidu: '百度网盘',
    aliyun: '阿里云盘',
    115: '115网盘',
    '123pan': '123云盘',
    torrent: '种子',
    ed2k: '电驴',
    xunlei: '迅雷',
    uc: 'UC网盘',
    tianyi: '天翼云'
  }
  return map[provider] || provider
}

const resources = computed(() => props.canonical.resources || [])
</script>

<template>
  <article class="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#111114] p-4 sm:p-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm">
    <!-- Top Row: Title & Metadata Tags -->
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-3">
      <div>
        <div class="flex flex-wrap items-baseline gap-2">
          <h2 class="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {{ canonical.title }}
          </h2>
          <span v-if="canonical.year" class="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
            {{ canonical.year }}
          </span>
        </div>

        <p v-if="canonical.originalTitle && canonical.originalTitle !== canonical.title" class="text-xs text-zinc-500 dark:text-zinc-500 font-mono mt-0.5">
          {{ canonical.originalTitle }}
        </p>
      </div>

      <!-- Size & Quality Specs -->
      <div class="flex flex-wrap items-center gap-1.5 font-mono text-[11px] self-start">
        <span v-if="canonical.resolution" class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium">
          {{ canonical.resolution }}
        </span>
        <span v-if="canonical.edition" class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
          {{ canonical.edition }}
        </span>
        <span v-if="canonical.codec" class="px-1.5 py-0.5 text-zinc-500">
          {{ canonical.codec }}
        </span>
        <span v-if="canonical.maxSizeBytes" class="px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium">
          {{ formatBytes(canonical.maxSizeBytes) }}
        </span>
      </div>
    </div>

    <!-- Provider Breakdown Chips -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-t border-zinc-100 dark:border-zinc-800/60">
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-zinc-400 dark:text-zinc-500 mr-1 font-mono">聚合来源:</span>
        <div
          v-for="(count, prov) in canonical.providerCounts"
          :key="prov"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border"
          :class="getProviderBadgeClass(prov as Provider)"
        >
          <span>{{ getProviderName(prov as Provider) }}</span>
          <span class="font-bold opacity-80">&times;{{ count }}</span>
        </div>
      </div>

      <!-- Toggle Collapsible Sources -->
      <button
        @click="isExpanded = !isExpanded"
        class="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-mono py-1 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <span>{{ isExpanded ? '收起来源' : `展开明细 (${resources.length})` }}</span>
        <ChevronUp v-if="isExpanded" class="w-3.5 h-3.5" />
        <ChevronDown v-else class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Expanded Sources List Table -->
    <div v-if="isExpanded && resources.length > 0" class="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
      <div
        v-for="res in resources"
        :key="res.id"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-xs"
      >
        <!-- Left: Source Title, Size, Status -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span
              class="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-medium border"
              :class="getProviderBadgeClass(res.provider)"
            >
              {{ res.provider }}
            </span>
            <span class="text-zinc-400 font-mono text-[11px]">
              {{ formatTimeAgo(res.discoveredAt || res.createdAt) }}
            </span>
            <span v-if="res.status === 'active'" class="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>可用</span>
            </span>
          </div>

          <div class="font-medium text-zinc-800 dark:text-zinc-200 truncate font-mono text-xs">
            {{ res.title }}
          </div>

          <div class="flex items-center gap-3 text-[11px] font-mono text-zinc-500 mt-1">
            <span v-if="res.sizeBytes">大小: {{ formatBytes(res.sizeBytes) }}</span>
            <span v-if="res.password" class="text-amber-600 dark:text-amber-400 font-semibold">
              提取码: {{ res.password }}
            </span>
            <span v-if="res.fileCount && res.fileCount > 1">
              含 {{ res.fileCount }} 个文件
            </span>
          </div>
        </div>

        <!-- Right: Action Buttons -->
        <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            v-if="res.password"
            @click="copyToClipboard(res.password, '提取码')"
            class="flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            title="复制提取码"
          >
            <Key class="w-3 h-3 text-amber-500" />
            <span class="font-mono">复制码</span>
          </button>

          <button
            v-if="res.url"
            @click="copyToClipboard(res.url, res.resourceType === 'magnet' ? '磁力链接' : '网盘链接')"
            class="flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            title="复制链接"
          >
            <Copy class="w-3 h-3" />
            <span class="font-mono">复制</span>
          </button>

          <a
            v-if="res.url && !res.url.startsWith('magnet:')"
            :href="res.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity font-medium"
          >
            <span>打开</span>
            <ExternalLink class="w-3 h-3" />
          </a>

          <button
            @click="emit('inspect', res)"
            class="p-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            title="查看资源详情及文件清单"
          >
            <FileText class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
