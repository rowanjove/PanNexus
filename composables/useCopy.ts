import { useToast } from './useToast'

export function useCopy() {
  const { success, error } = useToast()

  async function copyToClipboard(text: string, label = '内容') {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for non-https / legacy
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      success(`已复制${label}`)
      return true
    } catch {
      error(`复制${label}失败`)
      return false
    }
  }

  return { copyToClipboard }
}
