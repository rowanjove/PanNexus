<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
import AppFooter from '~/components/AppFooter.vue'
import ToastContainer from '~/components/ToastContainer.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 transition-colors">
    <AppHeader />
    <main class="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <slot />
    </main>
    <AppFooter />
    <ToastContainer />
  </div>
</template>
