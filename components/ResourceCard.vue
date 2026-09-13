<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CanonicalResource, Resource, Provider } from '~/shared/types'
import { useCopy } from '~/composables/useCopy'
import {
  ExternalLink,
  Copy,
  Key,
  FileText,
  ChevronDown,
  ChevronUp,
  Film,
  Tv,
  Sparkles,
  BookOpen,
  Terminal,
  Music,
  Gamepad2,
  FolderArchive,
  Download,
  Flame
} from 'lucide-vue-next'

const props = defineProps<{
  canonical: CanonicalResource
  activeProvider?: Provider | 'all'
}>()

const emit = defineEmits<{
  (e: 'inspect', resource: Resource): void
}>()

const isExpanded = ref(Boolean(props.canonical.resources && props.canonical.resources.length <= 3))
const selectedSourceProvider = ref<string>('all')
const posterFailed = ref(false)
const { copyToClipboard } = useCopy()

watch(
  () => props.activeProvider,
  (newProv) => {
    if (newProv && newProv !== 'all') {
      selectedSourceProvider.value = newProv
      isExpanded.value = true
    } else {
      selectedSourceProvider.value = 'all'
    }
  },
  { immediate: true }
)

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

function getProviderBadgeClass(provider: Provider | string): string {
  switch (provider) {
    case 'magnet':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
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
    case 'xunlei':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    case 'uc':
      return 'bg-amber-600/10 text-amber-600 dark:text-amber-400 border-amber-600/20'
    case 'tianyi':
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    case 'mobile':
      return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
    case 'torrent':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    default:
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
  }
}

function getProviderName(provider: Provider | string): string {
  const map: Record<string, string> = {
    magnet: 'Magnet 磁力',
    quark: '夸克网盘',
    baidu: '百度网盘',
    aliyun: '阿里云盘',
    115: '115网盘',
    '123pan': '123云盘',
    torrent: '种子',
    xunlei: '迅雷网盘',
    uc: 'UC网盘',
    tianyi: '天翼云盘',
    mobile: '移动云盘'
  }
  return map[provider] || provider
}

function getCategoryIcon(cat?: string | null) {
  switch (cat) {
    case 'movie': return Film
    case 'tv': return Tv
    case 'anime': return Sparkles
    case 'book': return BookOpen
    case 'software': return Terminal
    case 'game': return Gamepad2
    case 'music': return Music
    default: return FolderArchive
  }
}

function getCategoryLabel(cat?: string | null): string {
  switch (cat) {
    case 'movie': return '电影'
    case 'tv': return '剧集'
    case 'anime': return '动漫'
    case 'book': return '图书'
    case 'software': return '软件'
    case 'game': return '游戏'
    case 'music': return '音乐'
    default: return '综合'
  }
}

function copyComposite(url?: string | null, password?: string | null) {
  if (!url) return
  const text = password ? `${url} 提取码: ${password}` : url
  copyToClipboard(text, '网盘链接及提取码')
}

// All available resources belonging to this canonical entity
const allResources = computed(() => props.canonical.resources || [])

// Filtered by internal source tab (all vs specific provider)
const displayedResources = computed(() => {
  let list = allResources.value
  if (selectedSourceProvider.value !== 'all') {
    list = list.filter(r => r.provider === selectedSourceProvider.value)
  }
  return list
})

// Provider statistics for internal tabs
const providerTabOptions = computed(() => {
  const map = new Map<string, number>()
  for (const r of allResources.value) {
    map.set(r.provider, (map.get(r.provider) || 0) + 1)
  }
  return Array.from(map.entries()).map(([prov, count]) => ({
    provider: prov,
    name: getProviderName(prov),
    count
  }))
})
</script>

<template>
  <article class="group rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-[#121215] p-4 sm:p-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md">
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Left: Poster or Stylized Category Icon Banner -->
      <div class="shrink-0 self-center sm:self-start">
        <div
          v-if="canonical.posterUrl && !posterFailed"
          class="relative w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700/60 shadow-sm bg-zinc-100 dark:bg-zinc-800"
        >
          <img
            :src="canonical.posterUrl"
            :alt="canonical.title"
            loading="lazy"
            @error="posterFailed = true"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span
            v-if="canonical.category"
            class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/70 text-white backdrop-blur-xs font-mono"
          >
            {{ getCategoryLabel(canonical.category) }}
          </span>
        </div>

        <!-- Fallback Category Art Card when no poster available -->
        <div
          v-else
          class="w-20 sm:w-24 aspect-[2/3] rounded-lg border border-zinc-200/70 dark:border-zinc-800 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900/60 dark:to-zinc-900"
        >
          <component
            :is="getCategoryIcon(canonical.category)"
            class="w-6 h-6 text-zinc-400 dark:text-zinc-500 mb-1.5"
          />
          <span class="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 font-mono">
            {{ getCategoryLabel(canonical.category) }}
          </span>
          <span v-if="canonical.year" class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
            {{ canonical.year }}
          </span>
        </div>
      </div>

      <!-- Right: Main Information & Sources Area -->
      <div class="flex-1 min-w-0 flex flex-col justify-between">
        <!-- Top Row: Title, Category Badge, Specs -->
        <div>
          <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div class="flex flex-wrap items-baseline gap-2">
              <h2 class="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {{ canonical.title }}
              </h2>
              <span v-if="canonical.year" class="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                ({{ canonical.year }})
              </span>
            </div>

            <!-- Quality, Codec & Size Tags -->
            <div class="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span
                v-if="canonical.resolution"
                class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold"
              >
                {{ canonical.resolution }}
              </span>
              <span
                v-if="canonical.edition"
                class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium"
              >
                {{ canonical.edition }}
              </span>
              <span v-if="canonical.codec" class="px-1.5 py-0.5 text-zinc-400 dark:text-zinc-500">
                {{ canonical.codec }}
              </span>
              <span
                v-if="canonical.maxSizeBytes"
                class="px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
              >
                {{ formatBytes(canonical.maxSizeBytes) }}
              </span>
            </div>
          </div>

          <!-- Original Title & Alias -->
          <p
            v-if="canonical.originalTitle && canonical.originalTitle !== canonical.title"
            class="text-xs text-zinc-500 dark:text-zinc-400 font-mono mb-2"
          >
            {{ canonical.originalTitle }}
          </p>
        </div>

        <!-- Provider Breakdown Distribution Bar -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 pb-1 border-t border-zinc-100 dark:border-zinc-800/80">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-xs text-zinc-400 dark:text-zinc-500 mr-1 font-mono">聚合分布:</span>
            <div
              v-for="(count, prov) in canonical.providerCounts"
              :key="prov"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border"
              :class="getProviderBadgeClass(prov as Provider)"
            >
              <span>{{ getProviderName(prov as Provider) }}</span>
              <span class="font-bold opacity-90">&times;{{ count }}</span>
            </div>
          </div>

          <!-- Toggle Collapsible Details Button -->
          <button
            @click="isExpanded = !isExpanded"
            class="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-mono py-1 px-2.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <span>{{ isExpanded ? '收起源列表' : `查看全部 ${allResources.length} 个资源` }}</span>
            <ChevronUp v-if="isExpanded" class="w-3.5 h-3.5" />
            <ChevronDown v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Expanded Resource Source Links List -->
    <div v-if="isExpanded && allResources.length > 0" class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
      <!-- Internal Provider Tabs (if multi-provider) -->
      <div v-if="providerTabOptions.length > 1" class="flex flex-wrap items-center gap-1.5 mb-3">
        <button
          @click="selectedSourceProvider = 'all'"
          class="px-2.5 py-1 rounded-md text-xs font-mono transition-colors"
          :class="selectedSourceProvider === 'all'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
            : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'"
        >
          全部 ({{ allResources.length }})
        </button>

        <button
          v-for="tab in providerTabOptions"
          :key="tab.provider"
          @click="selectedSourceProvider = tab.provider"
          class="px-2.5 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1"
          :class="selectedSourceProvider === tab.provider
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
            : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'"
        >
          <span>{{ tab.name }}</span>
          <span class="opacity-75">({{ tab.count }})</span>
        </button>
      </div>

      <!-- Resource Rows -->
      <div class="space-y-2">
        <div
          v-for="res in displayedResources"
          :key="res.id"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-xs"
        >
          <!-- Left: Provider Tag, Title, Seeders, Size, Timestamp -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold border"
                :class="getProviderBadgeClass(res.provider)"
              >
                {{ getProviderName(res.provider) }}
              </span>

              <!-- Seeder Count for Torrents / Magnets -->
              <span
                v-if="typeof (res.metadata as any)?.seeders === 'number'"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px]"
                title="活跃做种数"
              >
                <Flame class="w-2.5 h-2.5" />
                <span>做种 {{ (res.metadata as any).seeders }}</span>
              </span>

              <span class="text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">
                {{ formatTimeAgo(res.discoveredAt || res.createdAt) }}
              </span>

              <span v-if="res.status === 'active'" class="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>可用</span>
              </span>
            </div>

            <!-- Title -->
            <div class="font-medium text-zinc-800 dark:text-zinc-200 font-mono text-xs break-all line-clamp-2">
              {{ res.title }}
            </div>

            <!-- Metadata specs -->
            <div class="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
              <span v-if="res.sizeBytes">大小: {{ formatBytes(res.sizeBytes) }}</span>
              <span v-if="res.password" class="text-amber-600 dark:text-amber-400 font-semibold">
                提取码: {{ res.password }}
              </span>
              <span v-if="res.fileCount && res.fileCount > 1">
                含 {{ res.fileCount }} 个文件
              </span>
            </div>
          </div>

          <!-- Right: Operation Action Buttons -->
          <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <!-- Copy Composite (Link + Password) -->
            <button
              v-if="res.url && res.password"
              @click="copyComposite(res.url, res.password)"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono font-medium transition-colors cursor-pointer"
              title="一键复制链接与提取码"
            >
              <Key class="w-3.5 h-3.5" />
              <span>复制链+码</span>
            </button>

            <!-- Copy Password Alone -->
            <button
              v-else-if="res.password"
              @click="copyToClipboard(res.password, '提取码')"
              class="flex items-center gap-1 px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
              title="复制提取码"
            >
              <Key class="w-3.5 h-3.5 text-amber-500" />
              <span>码: {{ res.password }}</span>
            </button>

            <!-- Magnet Direct Download Link -->
            <a
              v-if="res.url && res.url.startsWith('magnet:')"
              :href="res.url"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-mono font-medium transition-colors cursor-pointer"
              title="直接唤起本地 BT / 迅雷客户端"
            >
              <Download class="w-3.5 h-3.5" />
              <span>唤起下载</span>
            </a>

            <!-- Copy URL -->
            <button
              v-if="res.url"
              @click="copyToClipboard(res.url, res.resourceType === 'magnet' ? '磁力链接' : '网盘链接')"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
              title="复制链接"
            >
              <Copy class="w-3.5 h-3.5" />
              <span>复制</span>
            </button>

            <!-- Open Netdisk Web Page / Torrent Download -->
            <a
              v-if="res.url && !res.url.startsWith('magnet:')"
              :href="res.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity font-medium font-mono cursor-pointer"
              :title="res.resourceType === 'torrent' ? '下载种子文件' : '在新标签页打开网盘页面'"
            >
              <span>{{ res.resourceType === 'torrent' ? '下载种子' : '打开' }}</span>
              <Download v-if="res.resourceType === 'torrent'" class="w-3.5 h-3.5" />
              <ExternalLink v-else class="w-3.5 h-3.5" />
            </a>

            <!-- Inspect Details Drawer -->
            <button
              @click="emit('inspect', res)"
              class="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              title="查看详情及文件树"
            >
              <FileText class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
