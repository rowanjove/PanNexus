<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <div class="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center pointer-events-none gap-2 px-4">
    <transition-group
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-3 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-mono tracking-tight shadow-md border"
        :class="[
          t.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-800/60'
            : 'bg-zinc-900/95 text-zinc-100 border-zinc-700/60 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-300'
        ]"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="t.type === 'error' ? 'bg-rose-400' : 'bg-emerald-400'" />
        <span>{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>
