/**
 * Validates whether an outbound URL is safe to fetch, guarding against SSRF,
 * private networks, loopback addresses, and cloud provider metadata services.
 */
export function isSafeUrl(rawUrl: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl)

    // 1. Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}` }
    }

    const host = parsed.hostname.toLowerCase()

    // 2. Disallow localhost / loopback names
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === 'ip6-localhost') {
      return { safe: false, reason: 'Loopback hostname is blocked' }
    }

    // 3. IPv4 Checks
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4Match) {
      const octets = [
        parseInt(ipv4Match[1], 10),
        parseInt(ipv4Match[2], 10),
        parseInt(ipv4Match[3], 10),
        parseInt(ipv4Match[4], 10)
      ]

      // Verify valid octets
      if (octets.some(o => o < 0 || o > 255)) {
        return { safe: false, reason: 'Invalid IP address' }
      }

      // Loopback: 127.0.0.0/8
      if (octets[0] === 127) {
        return { safe: false, reason: 'Loopback IP (127.x.x.x) is blocked' }
      }

      // Zero IP: 0.0.0.0/8
      if (octets[0] === 0) {
        return { safe: false, reason: 'Zero IP is blocked' }
      }

      // Private 10.0.0.0/8
      if (octets[0] === 10) {
        return { safe: false, reason: 'Private IP (10.x.x.x) is blocked' }
      }

      // Private 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
        return { safe: false, reason: 'Private IP (172.16~31.x.x) is blocked' }
      }

      // Private 192.168.0.0/16
      if (octets[0] === 192 && octets[1] === 168) {
        return { safe: false, reason: 'Private IP (192.168.x.x) is blocked' }
      }

      // Cloud Metadata & Link-Local: 169.254.0.0/16 (e.g. AWS/GCP 169.254.169.254)
      if (octets[0] === 169 && octets[1] === 254) {
        return { safe: false, reason: 'Link-local/Cloud metadata IP (169.254.x.x) is blocked' }
      }
    }

    // 4. IPv4-mapped IPv6 (::ffff:127.0.0.1 / ::ffff:7f00:1)
    const v4mapped = host.replace(/^\[|\]$/g, '').match(/^::ffff:([0-9.]+)$/i)
      || host.replace(/^\[|\]$/g, '').match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
    if (v4mapped) {
      if (v4mapped[1].includes('.')) {
        return isSafeUrl(`http://${v4mapped[1]}/`)
      }
      const hi = parseInt(v4mapped[1], 16)
      const lo = parseInt(v4mapped[2], 16)
      const mapped = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`
      return isSafeUrl(`http://${mapped}/`)
    }

    // 5. IPv6 loopback, link-local, unique-local
    const bare = host.replace(/^\[|\]$/g, '')
    if (bare.includes(':') && (bare === '::1' || bare.startsWith('fe80:') || bare.startsWith('fc') || bare.startsWith('fd'))) {
      return { safe: false, reason: 'IPv6 local/private address is blocked' }
    }

    if (host.endsWith('.nip.io') || host.endsWith('.sslip.io') || host === 'metadata.google.internal') {
      return { safe: false, reason: 'SSRF-prone hostname is blocked' }
    }

    return { safe: true }
  } catch {
    return { safe: false, reason: 'Invalid URL format' }
  }
}
