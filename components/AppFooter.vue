<template>
  <footer class="w-full border-t border-zinc-200 dark:border-zinc-800 py-6 mt-16 text-xs text-zinc-500 font-mono">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>CF D1 + FTS5 Native</span>
        </span>
        <span class="text-zinc-300 dark:text-zinc-700">|</span>
        <span>Local Index P50 &lt; 80ms</span>
      </div>

      <div class="flex items-center gap-4 text-zinc-400 dark:text-zinc-600">
        <span>PanNexus v1.0.0</span>
        <NuxtLink to="/admin" class="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" title="管理控制台">·</NuxtLink>
        <span>Federated Resource Index</span>
      </div>
    </div>
  </footer>
</template>
