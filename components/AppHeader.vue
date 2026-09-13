<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'
import { Sun, Moon, Search, Layers, ShieldCheck } from 'lucide-vue-next'

const { isDark, toggleTheme } = useTheme()
const router = useRouter()

function focusSearch() {
  const input = document.getElementById('global-search-input')
  if (input) {
    input.focus()
  } else {
    router.push('/search')
  }
}
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#09090B]/95 backdrop-blur-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
      <!-- Left: Brand Logo -->
      <div class="flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <div class="w-6 h-6 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-mono text-xs font-bold tracking-wider">
            P
          </div>
          <div class="flex items-baseline gap-1.5">
            <span class="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">PanNexus</span>
            <span class="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 hidden sm:inline">Federated Index</span>
          </div>
        </NuxtLink>

        <!-- Main Nav -->
        <nav class="hidden md:flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <NuxtLink
            to="/search"
            class="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            active-class="text-zinc-900 dark:text-zinc-100 font-semibold"
          >
            聚合搜索
          </NuxtLink>
        </nav>
      </div>

      <!-- Right: Search Shortcut & Theme Toggle -->
      <div class="flex items-center gap-3">
        <button
          @click="focusSearch"
          class="hidden sm:flex items-center gap-2 px-2.5 py-1 text-xs border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          title="快速搜索"
        >
          <Search class="w-3.5 h-3.5" />
          <span>搜索资源...</span>
          <kbd class="font-mono text-[10px] px-1 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-400">
            /
          </kbd>
        </button>

        <button
          @click="toggleTheme"
          class="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
          :title="isDark ? '切换至亮色模式' : '切换至暗色模式'"
          aria-label="Toggle Theme"
        >
          <Sun v-if="isDark" class="w-4 h-4" />
          <Moon v-else class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>
