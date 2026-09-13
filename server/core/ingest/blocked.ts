export interface BlockedItem {
  type: string
  value: string
}

export function isResourceBlocked(
  item: { title?: string; url?: string; infohash?: string },
  blocked: BlockedItem[]
): boolean {
  for (const entry of blocked) {
    const value = String(entry.value || '').trim().toLowerCase()
    if (!value) continue

    if (entry.type === 'keyword' && item.title?.toLowerCase().includes(value)) {
      return true
    }
    if (entry.type === 'domain' && item.url?.toLowerCase().includes(value)) {
      return true
    }
    if (entry.type === 'infohash' && item.infohash?.toLowerCase() === value) {
      return true
    }
  }
  return false
}
