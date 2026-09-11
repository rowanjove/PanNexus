import { ref, onMounted } from 'vue'

const isDark = ref(false)

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme()
  }

  function applyTheme() {
    if (typeof window === 'undefined') return
    if (isDark.value) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('metaseek_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('metaseek_theme', 'light')
    }
  }

  onMounted(() => {
    const saved = localStorage.getItem('metaseek_theme')
    if (saved) {
      isDark.value = saved === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  })

  return {
    isDark,
    toggleTheme
  }
}
