import crypto from 'node:crypto'
import type { Provider, ResourceType } from '~/shared/types'

/**
 * Strips tracking parameters and normalizes URL for deduplication.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    // List of tracking query parameters to discard
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'spm', 'from', 'source', 'ref', 'share_source', 'channel', '_at'
    ]
    for (const p of trackingParams) {
      parsed.searchParams.delete(p)
    }
    // Remove trailing slash in path if not root
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }
    return parsed.toString()
  } catch {
    return rawUrl.trim()
  }
}

/**
 * Calculates a SHA-256 hash for a normalized URL.
 */
export function calculateUrlHash(url: string): string {
  const clean = normalizeUrl(url)
  return crypto.createHash('sha256').update(clean).digest('hex')
}

/**
 * Parses a magnet URI and extracts the standardized 40-char hex infohash.
 */
export function parseMagnetInfohash(magnetUri: string): { infohash?: string; displayName?: string; trackers: string[] } {
  const result: { infohash?: string; displayName?: string; trackers: string[] } = {
    trackers: []
  }

  if (!magnetUri.startsWith('magnet:?')) {
    return result
  }

  const queryPart = magnetUri.slice(8)
  const params = new URLSearchParams(queryPart)

  // xt = urn:btih:<hash>
  const xtList = params.getAll('xt')
  for (const xt of xtList) {
    const match = xt.match(/urn:btih:([a-zA-Z0-9]{32,40})/i)
    if (match) {
      const hashStr = match[1]
      if (hashStr.length === 40) {
        result.infohash = hashStr.toLowerCase()
      } else if (hashStr.length === 32) {
        // Base32 to Hex conversion
        try {
          result.infohash = base32ToHex(hashStr).toLowerCase()
        } catch {
          result.infohash = hashStr.toLowerCase()
        }
      }
      break
    }
  }

  // dn = display name
  const dn = params.get('dn')
  if (dn) {
    result.displayName = decodeURIComponent(dn)
  }

  // tr = tracker
  result.trackers = params.getAll('tr').map(t => decodeURIComponent(t))

  return result
}

/**
 * Helper to convert Base32 string to Hex string.
 */
function base32ToHex(base32: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (let i = 0; i < base32.length; i++) {
    const val = alphabet.indexOf(base32.charAt(i).toUpperCase())
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  let hex = ''
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substring(i, i + 4)
    hex += parseInt(chunk, 2).toString(16)
  }
  return hex
}

/**
 * Infers provider and resource type from a given URL or identifier.
 */
export function inferProviderAndType(url?: string): { provider: Provider; resourceType: ResourceType } {
  if (!url) {
    return { provider: 'unknown', resourceType: 'other' }
  }

  const lower = url.toLowerCase().trim()

  if (lower.startsWith('magnet:?')) {
    return { provider: 'magnet', resourceType: 'magnet' }
  }
  if (lower.startsWith('ed2k://')) {
    return { provider: 'ed2k', resourceType: 'ed2k' }
  }
  if (lower.endsWith('.torrent') || lower.includes('.torrent?')) {
    return { provider: 'torrent', resourceType: 'torrent' }
  }

  // Netdisk domain recognition
  if (lower.includes('pan.baidu.com')) return { provider: 'baidu', resourceType: 'cloud_drive' }
  if (lower.includes('alipan.com') || lower.includes('aliyundrive.com')) return { provider: 'aliyun', resourceType: 'cloud_drive' }
  if (lower.includes('pan.quark.cn')) return { provider: 'quark', resourceType: 'cloud_drive' }
  if (lower.includes('115.com') || lower.includes('anxia.com')) return { provider: '115', resourceType: 'cloud_drive' }
  if (lower.includes('123pan.com') || lower.includes('123684.com')) return { provider: '123pan', resourceType: 'cloud_drive' }
  if (lower.includes('drive.uc.cn')) return { provider: 'uc', resourceType: 'cloud_drive' }
  if (lower.includes('pan.xunlei.com')) return { provider: 'xunlei', resourceType: 'cloud_drive' }
  if (lower.includes('cloud.189.cn')) return { provider: 'tianyi', resourceType: 'cloud_drive' }
  if (lower.includes('mypikpak.com') || lower.includes('pikpak.me')) return { provider: 'pikpak', resourceType: 'cloud_drive' }

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return { provider: 'unknown', resourceType: 'http' }
  }

  return { provider: 'unknown', resourceType: 'other' }
}
