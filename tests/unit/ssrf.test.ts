import { describe, it, expect } from 'vitest'
import { isSafeUrl } from '../../server/core/security/ssrf'

describe('SSRF Defense Engine', () => {
  it('allows safe public internet URLs', () => {
    expect(isSafeUrl('https://pan.quark.cn/s/123').safe).toBe(true)
    expect(isSafeUrl('https://api.telegram.org/bot123').safe).toBe(true)
    expect(isSafeUrl('http://tracker.opentrackr.org:1337/announce').safe).toBe(true)
  })

  it('blocks loopback hostnames and localhost', () => {
    expect(isSafeUrl('http://localhost:3000/api').safe).toBe(false)
    expect(isSafeUrl('http://test.localhost/api').safe).toBe(false)
    expect(isSafeUrl('http://127.0.0.1/admin').safe).toBe(false)
    expect(isSafeUrl('http://127.1.2.3:8080/').safe).toBe(false)
  })

  it('blocks RFC1918 private IPv4 subnets', () => {
    expect(isSafeUrl('http://10.0.0.1/internal').safe).toBe(false)
    expect(isSafeUrl('http://172.16.5.10/admin').safe).toBe(false)
    expect(isSafeUrl('http://172.31.255.254/').safe).toBe(false)
    expect(isSafeUrl('http://192.168.1.1/router').safe).toBe(false)
  })

  it('blocks cloud metadata endpoint 169.254.169.254', () => {
    expect(isSafeUrl('http://169.254.169.254/latest/meta-data/').safe).toBe(false)
    expect(isSafeUrl('http://[::ffff:127.0.0.1]/').safe).toBe(false)
    expect(isSafeUrl('http://[::ffff:169.254.169.254]/').safe).toBe(false)
    expect(isSafeUrl('http://example.nip.io/').safe).toBe(false)
  })

  it('blocks non-HTTP protocols', () => {
    expect(isSafeUrl('file:///etc/passwd').safe).toBe(false)
    expect(isSafeUrl('gopher://127.0.0.1:6379/_').safe).toBe(false)
    expect(isSafeUrl('ftp://example.com/test').safe).toBe(false)
  })
})
