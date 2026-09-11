<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CanonicalResource, Resource } from '~/shared/types'
import { useCopy } from '~/composables/useCopy'
import { ChevronRight, Copy, ExternalLink, Key, HardDrive, FileText, ArrowLeft, CheckCircle2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const id = String(route.params.id)

const canonical = ref<CanonicalResource | null>(null)
const resources = ref<Resource[]>([])
const isLoading = ref(true)
const fileSearch = ref('')

const { copyToClipboard } = useCopy()

async function loadDetail() {
  isLoading.value = true
  try {
    const data = await $fetch<any>(`/api/v1/resources/${id}`)
    canonical.value = data?.canonical || null
    resources.value = data?.resources || []
  } catch {
    canonical.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDetail()
})

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '--'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getProviderName(provider: string): string {
  const map: Record<string, string> = {
    magnet: 'Magnet 磁力',
    quark: '夸克网盘',
    baidu: '百度网盘',
    aliyun: '阿里云盘',
    115: '115网盘',
    '123pan': '123云盘',
    torrent: '种子',
    ed2k: '电驴'
  }
  return map[provider] || provider
}

// Flatten files from all resources
const allFiles = computed(() => {
  const files: any[] = []
  for (const r of resources.value) {
    if (r.files && r.files.length > 0) {
      files.push(...r.files)
    }
  }
  if (!fileSearch.value.trim()) return files
  const q = fileSearch.value.toLowerCase()
  return files.filter(f => f.filename.toLowerCase().includes(q))
})
</script>

<template>
  <div class="space-y-6 font-mono text-xs">
    <!-- Breadcrumb & Back -->
    <div class="flex items-center gap-2 text-zinc-500 text-[11px]">
      <NuxtLink to="/" class="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
        首页
      </NuxtLink>
      <ChevronRight class="w-3 h-3" />
      <NuxtLink to="/search" class="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
        聚合搜索
      </NuxtLink>
      <ChevronRight class="w-3 h-3" />
      <span class="text-zinc-800 dark:text-zinc-200 truncate max-w-xs">
        {{ canonical?.title || id }}
      </span>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-16 text-center text-zinc-400">
      <div class="inline-block w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mb-2" />
      <div>加载实体档案与多源链接中...</div>
    </div>

    <!-- Main Detail Content -->
    <div v-else-if="canonical" class="space-y-6">
      <!-- Entity Banner Card -->
      <div class="p-5 sm:p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-3 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div class="flex items-baseline gap-2.5">
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
                {{ canonical.title }}
              </h1>
              <span v-if="canonical.year" class="text-sm font-semibold text-zinc-500">
                {{ canonical.year }}
              </span>
            </div>
            <p v-if="canonical.originalTitle" class="text-xs text-zinc-400 mt-1">
              {{ canonical.originalTitle }}
            </p>
          </div>

          <!-- Quality & Format Pills -->
          <div class="flex flex-wrap items-center gap-1.5 self-start">
            <span v-if="canonical.resolution" class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium text-zinc-800 dark:text-zinc-200">
              {{ canonical.resolution }}
            </span>
            <span v-if="canonical.edition" class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
              {{ canonical.edition }}
            </span>
            <span v-if="canonical.codec" class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
              {{ canonical.codec }}
            </span>
            <span v-if="canonical.category" class="px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 uppercase font-medium">
              {{ canonical.category }}
            </span>
          </div>
        </div>

        <!-- Meta specs bar -->
        <div class="flex flex-wrap items-center gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500">
          <span>实体标识: <strong class="text-zinc-700 dark:text-zinc-300 select-all">{{ canonical.id }}</strong></span>
          <span>·</span>
          <span>收录来源: <strong class="text-zinc-700 dark:text-zinc-300">{{ resources.length }} 个节点</strong></span>
          <span>·</span>
          <span>归一化指纹: <strong class="text-zinc-700 dark:text-zinc-300">{{ canonical.normalizedKey }}</strong></span>
        </div>
      </div>

      <!-- Sources Table Section -->
      <div class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] overflow-hidden">
        <div class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between">
          <span class="font-semibold text-zinc-900 dark:text-zinc-100">
            全部来源渠道 ({{ resources.length }})
          </span>
          <span class="text-zinc-400 text-[11px]">包含网盘直链、磁链与提取密码</span>
        </div>

        <div class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          <div
            v-for="r in resources"
            :key="r.id"
            class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-bold text-zinc-800 dark:text-zinc-200">
                  {{ getProviderName(r.provider) }}
                </span>
                <span class="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{{ r.status }}</span>
                </span>
              </div>
              <div class="text-zinc-700 dark:text-zinc-300 font-medium truncate font-sans">
                {{ r.title }}
              </div>
              <div class="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                <span>体积: {{ formatBytes(r.sizeBytes) }}</span>
                <span v-if="r.password" class="text-amber-600 dark:text-amber-400 font-bold">
                  提取码: {{ r.password }}
                </span>
                <span v-if="r.infohash" class="truncate max-w-xs">
                  Hash: {{ r.infohash.slice(0, 16) }}...
                </span>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="r.password"
                @click="copyToClipboard(r.password, '提取码')"
                class="flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Key class="w-3 h-3 text-amber-500" />
                <span>复制提取码</span>
              </button>
              <button
                v-if="r.url"
                @click="copyToClipboard(r.url, '链接')"
                class="flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Copy class="w-3 h-3" />
                <span>复制链接</span>
              </button>
              <a
                v-if="r.url && !r.url.startsWith('magnet:')"
                :href="r.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 px-3.5 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium"
              >
                <span>立即打开</span>
                <ExternalLink class="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- File List (If available) -->
      <div v-if="allFiles.length > 0" class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span class="font-semibold text-zinc-900 dark:text-zinc-100">
            种子内部文件清单 ({{ allFiles.length }})
          </span>
          <input
            v-model="fileSearch"
            type="text"
            placeholder="搜索文件..."
            class="py-1 px-2.5 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs w-full sm:w-60 focus:outline-none"
          />
        </div>

        <div class="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-72 overflow-y-auto">
          <div
            v-for="f in allFiles"
            :key="f.id || f.filename"
            class="py-2 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
          >
            <span class="truncate text-zinc-700 dark:text-zinc-300 mr-2">{{ f.path || f.filename }}</span>
            <span class="text-zinc-400 text-[11px] shrink-0">{{ formatBytes(f.sizeBytes) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="text-center py-16 text-zinc-400">
      未找到该资源实体档案。
    </div>
  </div>
</template>
