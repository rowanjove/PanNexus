import crypto from 'node:crypto'
import type { ResourceFile } from '~/shared/types'

export interface ParsedTorrent {
  name: string
  infohash: string
  magnetUri: string
  totalSizeBytes: number
  pieceLength?: number
  trackers: string[]
  files: ResourceFile[]
}

/**
 * Pure TypeScript Bencode Decoder.
 * Decodes bencoded Buffers or Uint8Arrays into JS primitives, arrays, and maps.
 */
export class BencodeDecoder {
  private data: Uint8Array
  private pos = 0

  constructor(data: Uint8Array) {
    this.data = data
  }

  public decode(): any {
    if (this.pos >= this.data.length) return null

    const byte = this.data[this.pos]
    if (byte === undefined) return null

    // Integer: i<digits>e
    if (byte === 0x69) { // 'i'
      this.pos++
      let end = this.pos
      while (end < this.data.length && this.data[end] !== 0x65) end++ // 'e'
      const numStr = new TextDecoder().decode(this.data.subarray(this.pos, end))
      this.pos = end + 1
      return parseInt(numStr, 10)
    }

    // List: l<items>e
    if (byte === 0x6C) { // 'l'
      this.pos++
      const list: any[] = []
      while (this.pos < this.data.length && this.data[this.pos] !== 0x65) {
        list.push(this.decode())
      }
      this.pos++ // consume 'e'
      return list
    }

    // Dictionary: d<key><val>e
    if (byte === 0x64) { // 'd'
      this.pos++
      const dict: Record<string, any> = {}
      while (this.pos < this.data.length && this.data[this.pos] !== 0x65) {
        const key = this.decodeString()
        const val = this.decode()
        dict[key] = val
      }
      this.pos++ // consume 'e'
      return dict
    }

    // String: <length>:<bytes>
    if (byte >= 0x30 && byte <= 0x39) { // '0'..'9'
      return this.decodeString()
    }

    throw new Error(`Unexpected bencode byte: 0x${byte.toString(16)} at offset ${this.pos}`)
  }

  private decodeString(): string {
    let colon = this.pos
    while (colon < this.data.length && this.data[colon] !== 0x3A) colon++ // ':'
    const lenStr = new TextDecoder().decode(this.data.subarray(this.pos, colon))
    const len = parseInt(lenStr, 10)
    this.pos = colon + 1
    const strBytes = this.data.subarray(this.pos, this.pos + len)
    this.pos += len
    return new TextDecoder().decode(strBytes)
  }
}

/**
 * Parses raw .torrent bytes and computes BTIH infohash and file structure.
 */
export function parseTorrent(buffer: Uint8Array): ParsedTorrent {
  // 1. Locate info dict slice to compute exact SHA-1 InfoHash
  const infoStart = findSubarray(buffer, new TextEncoder().encode('4:info'))
  if (infoStart === -1) {
    throw new Error('Invalid torrent: missing info dictionary')
  }

  const decoder = new BencodeDecoder(buffer)
  const meta = decoder.decode()
  const info = meta?.info

  if (!info) {
    throw new Error('Failed to parse torrent info')
  }

  // Find info dictionary range
  const sliceStart = infoStart + 6 // after '4:info'
  // Info dictionary starts with 'd' and ends with matching 'e'
  let depth = 0
  let sliceEnd = sliceStart
  for (let i = sliceStart; i < buffer.length; i++) {
    if (buffer[i] === 0x64 || buffer[i] === 0x6C) depth++ // 'd' or 'l'
    else if (buffer[i] === 0x65) { // 'e'
      depth--
      if (depth === 0) {
        sliceEnd = i + 1
        break
      }
    }
  }

  const infoBytes = buffer.subarray(sliceStart, sliceEnd)
  const infohash = crypto.createHash('sha1').update(infoBytes).digest('hex').toLowerCase()

  const name = info.name || 'Unknown Torrent'
  const pieceLength = info['piece length']
  const trackers: string[] = []
  if (meta.announce) trackers.push(meta.announce)
  if (Array.isArray(meta['announce-list'])) {
    for (const tier of meta['announce-list']) {
      if (Array.isArray(tier)) {
        for (const tr of tier) if (typeof tr === 'string') trackers.push(tr)
      }
    }
  }

  const files: ResourceFile[] = []
  let totalSizeBytes = 0

  if (Array.isArray(info.files)) {
    // Multi-file torrent
    for (const f of info.files) {
      const fPath = Array.isArray(f.path) ? f.path.join('/') : String(f.path || '')
      const fName = fPath.split('/').pop() || fPath
      const fSize = Number(f.length || 0)
      totalSizeBytes += fSize
      const ext = fName.includes('.') ? fName.split('.').pop()?.toLowerCase() : undefined

      files.push({
        path: `/${fPath}`,
        filename: fName,
        extension: ext,
        sizeBytes: fSize
      })
    }
  } else {
    // Single file torrent
    const fSize = Number(info.length || 0)
    totalSizeBytes = fSize
    const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined
    files.push({
      path: `/${name}`,
      filename: name,
      extension: ext,
      sizeBytes: fSize
    })
  }

  const magnetUri = `magnet:?xt=urn:btih:${infohash}&dn=${encodeURIComponent(name)}`

  return {
    name,
    infohash,
    magnetUri,
    totalSizeBytes,
    pieceLength,
    trackers,
    files
  }
}

function findSubarray(haystack: Uint8Array, needle: Uint8Array): number {
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let match = true
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}
