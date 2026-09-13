import type { H3Event } from 'h3'

const ENV_KEYS = [
  'METASEEK_ADMIN_TOKEN',
  'METASEEK_CRON_SECRET',
  'METASEEK_INGEST_TOKEN',
  'TORZNAB_URL',
  'TORZNAB_API_KEY',
  'ALIST_BASE_URL',
  'ALIST_TOKEN',
  'TMDB_API_KEY'
]

export function getCloudflareEnv(event?: H3Event): Record<string, any> {
  return ((event?.context as any)?.cloudflare?.env || {}) as Record<string, any>
}

export function readEnv(name: string, event?: H3Event): string | undefined {
  const cf = getCloudflareEnv(event)
  if (cf[name] != null && String(cf[name]).length > 0) return String(cf[name])
  if (typeof process !== 'undefined' && process.env?.[name]) return process.env[name]
  return undefined
}

export function hydrateEnv(event?: H3Event) {
  if (typeof process === 'undefined' || !process.env) return
  const cf = getCloudflareEnv(event)
  for (const key of ENV_KEYS) {
    if (cf[key] && !process.env[key]) {
      process.env[key] = String(cf[key])
    }
  }
}

export function isDevRuntime(): boolean {
  return Boolean((import.meta as any).dev)
}

export function defaultAdminToken(): string {
  return (typeof process !== 'undefined' && process.env?.METASEEK_ADMIN_TOKEN) || (isDevRuntime() ? 'metaseek_admin_dev' : '')
}

export function defaultIngestToken(): string {
  return (typeof process !== 'undefined' && process.env?.METASEEK_INGEST_TOKEN) || (isDevRuntime() ? 'metaseek_secret_ingest_token_2025' : '')
}
