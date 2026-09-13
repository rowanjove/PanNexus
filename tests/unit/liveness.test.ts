import { describe, it, expect, vi } from 'vitest'
import { checkPanLinkLiveness } from '../../server/core/dedup/liveness'

describe('Netdisk Link Liveness Checker', () => {
  it('validates magnet format immediately without network', async () => {
    const validMag = await checkPanLinkLiveness('magnet:?xt=urn:btih:e3b0c44298fc1c149afbf4c8996fb92427ae41e4')
    expect(validMag.alive).toBe(true)

    const invalidMag = await checkPanLinkLiveness('magnet:?xt=bad_format')
    expect(invalidMag.alive).toBe(false)
  })

  it('detects 404 dead link', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })))
    try {
      const res = await checkPanLinkLiveness('https://pan.quark.cn/s/dead123')
      expect(res.alive).toBe(false)
      expect(res.statusCode).toBe(404)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('detects expired keyword in returned html', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><body>该分享已被取消</body></html>', { status: 200 })))
    try {
      const res = await checkPanLinkLiveness('https://pan.baidu.com/s/canceled123')
      expect(res.alive).toBe(false)
      expect(res.reason).toBe('content_indicates_expired')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('considers normal sharing page as alive', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><body>文件列表：沙丘2.4K.mp4 (3.2GB)</body></html>', { status: 200 })))
    try {
      const res = await checkPanLinkLiveness('https://www.alipan.com/s/alive123')
      expect(res.alive).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
