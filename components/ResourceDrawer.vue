<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Resource } from '~/shared/types'
import { useCopy } from '~/composables/useCopy'
import { X, Copy, ExternalLink, FileCode, HardDrive, Key, Download } from 'lucide-vue-next'

const props = defineProps<{
  resource: Resource | null
  open?: boolean
  isOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const isVisible = computed(() => Boolean(props.open || props.isOpen))
const { copyToClipboard } = useCopy()

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isVisible.value) {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', handleKeyDown))
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '--'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getProviderName(provider?: string): string {
  if (!provider) return '--'
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

function copyComposite(url?: string | null, password?: string | null) {
  if (!url) return
  const text = password ? `${url} 提取码: ${password}` : url
  copyToClipboard(text, '网盘链接及提取码')
}
</script>

<template>
  <div v-if="isVisible && resource" class="fixed inset-0 z-50 flex justify-end">
    <!-- Backdrop -->
    <div
      @click="emit('close')"
      class="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
    />

    <!-- Panel -->
    <aside class="relative z-10 w-full max-w-lg bg-white dark:bg-[#111114] border-l border-zinc-200 dark:border-zinc-800 h-full flex flex-col shadow-2xl overflow-y-auto">
      <!-- Drawer Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/95 dark:bg-[#111114]/95 backdrop-blur-sm z-10">
        <div class="flex items-center gap-2">
          <HardDrive class="w-4 h-4 text-zinc-500" />
          <span class="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
            资源详情与文件
          </span>
        </div>
        <button
          @click="emit('close')"
          class="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Drawer Content -->
      <div class="p-5 space-y-5 flex-1">
        <!-- Title & Basic Info -->
        <div>
          <label class="text-[11px] font-mono uppercase text-zinc-400 dark:text-zinc-500 block mb-1">
            原始标题
          </label>
          <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100 break-all font-mono">
            {{ resource.title }}
          </p>
        </div>

        <!-- Key Specs Grid -->
        <div class="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs font-mono">
          <div>
            <span class="text-zinc-400 block text-[11px]">资源形式</span>
            <span class="font-medium text-zinc-800 dark:text-zinc-200">{{ resource.resourceType }}</span>
          </div>
          <div>
            <span class="text-zinc-400 block text-[11px]">存储渠道</span>
            <span class="font-medium text-zinc-800 dark:text-zinc-200">{{ getProviderName(resource.provider) }}</span>
          </div>
          <div>
            <span class="text-zinc-400 block text-[11px]">资源体积</span>
            <span class="font-medium text-zinc-800 dark:text-zinc-200">{{ formatBytes(resource.sizeBytes) }}</span>
          </div>
          <div>
            <span class="text-zinc-400 block text-[11px]">健康状态</span>
            <span class="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {{ resource.status }}
            </span>
          </div>
        </div>

        <!-- Password / Extraction Code -->
        <div v-if="resource.password">
          <label class="text-[11px] font-mono uppercase text-zinc-400 dark:text-zinc-500 block mb-1">
            提取码 / 访问密码
          </label>
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 font-mono text-xs">
            <div class="flex items-center gap-2">
              <Key class="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span class="font-bold text-amber-700 dark:text-amber-300 text-sm select-all">{{ resource.password }}</span>
            </div>
            <button
              @click="copyToClipboard(resource.password!, '提取码')"
              class="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-mono transition-colors cursor-pointer"
            >
              <Copy class="w-3.5 h-3.5" />
              <span>复制提取码</span>
            </button>
          </div>
        </div>

        <!-- InfoHash (If Magnet/Torrent) -->
        <div v-if="resource.infohash">
          <label class="text-[11px] font-mono uppercase text-zinc-400 dark:text-zinc-500 block mb-1">
            BTIH InfoHash
          </label>
          <div class="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 font-mono text-xs">
            <span class="truncate mr-2 select-all font-mono">{{ resource.infohash }}</span>
            <button
              @click="copyToClipboard(resource.infohash!, 'InfoHash')"
              class="shrink-0 p-1 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
              title="复制 InfoHash"
            >
              <Copy class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Direct Link / Magnet -->
        <div v-if="resource.url">
          <label class="text-[11px] font-mono uppercase text-zinc-400 dark:text-zinc-500 block mb-1">
            渠道链接
          </label>
          <div class="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 font-mono text-xs">
            <span class="truncate mr-2 select-all font-mono">{{ resource.url }}</span>
            <button
              @click="copyToClipboard(resource.url!, resource.resourceType === 'magnet' ? '磁力链接' : '链接')"
              class="shrink-0 p-1 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
              title="复制链接"
            >
              <Copy class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Files List (If available) -->
        <div v-if="resource.fileCount && resource.fileCount > 0">
          <div class="flex items-center justify-between mb-2">
            <label class="text-[11px] font-mono uppercase text-zinc-400 dark:text-zinc-500">
              包含文件清单 ({{ resource.fileCount }})
            </label>
          </div>

          <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-60 overflow-y-auto font-mono text-xs">
            <div class="p-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
              <div class="flex items-center gap-2 truncate pr-2">
                <FileCode class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span class="truncate text-zinc-700 dark:text-zinc-300">{{ resource.title }}</span>
              </div>
              <span class="text-zinc-400 text-[11px] shrink-0">{{ formatBytes(resource.sizeBytes) }}</span>
            </div>
          </div>
        </div>

        <!-- Metadata JSON viewer -->
        <div v-if="resource.metadata">
          <label class="text-[11px] font-mono uppercase text-zinc-400 dark:text-zinc-500 block mb-1">
            结构化元数据 (Metadata)
          </label>
          <pre class="p-3 rounded-lg bg-zinc-900 text-zinc-200 text-[11px] font-mono overflow-x-auto border border-zinc-800">{{ JSON.stringify(resource.metadata, null, 2) }}</pre>
        </div>
      </div>

      <!-- Drawer Footer Action -->
      <div class="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-end gap-2.5 sticky bottom-0 bg-white dark:bg-[#111114]">
        <!-- Copy Composite if password exists -->
        <button
          v-if="resource.url && resource.password"
          @click="copyComposite(resource.url, resource.password)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-mono font-medium transition-colors cursor-pointer"
          title="一键复制链接与提取码"
        >
          <Key class="w-3.5 h-3.5" />
          <span>复制链+码</span>
        </button>

        <!-- Copy URL -->
        <button
          v-if="resource.url"
          @click="copyToClipboard(resource.url!, resource.resourceType === 'magnet' ? '磁力链接' : '链接')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <Copy class="w-3.5 h-3.5" />
          <span>复制链接</span>
        </button>

        <!-- Magnet client trigger -->
        <a
          v-if="resource.url && resource.url.startsWith('magnet:')"
          :href="resource.url"
          class="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-mono font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
        >
          <Download class="w-3.5 h-3.5" />
          <span>唤起下载</span>
        </a>

        <!-- Torrent file download or external netdisk web page -->
        <a
          v-else-if="resource.url"
          :href="resource.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-mono font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <span>{{ resource.resourceType === 'torrent' ? '下载种子' : '立即前往' }}</span>
          <Download v-if="resource.resourceType === 'torrent'" class="w-3.5 h-3.5" />
          <ExternalLink v-else class="w-3.5 h-3.5" />
        </a>
      </div>
    </aside>
  </div>
</template>
