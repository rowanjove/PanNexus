import { createError, getCookie, getHeader, type H3Event } from 'h3'
import { defaultAdminToken, defaultIngestToken, isDevRuntime, readEnv } from './env'

export const ADMIN_COOKIE = 'metaseek_admin'

export function expectedAdminToken(event?: H3Event): string {
  return readEnv('METASEEK_ADMIN_TOKEN', event) || defaultAdminToken()
}

export function expectedCronSecret(event?: H3Event): string {
  return readEnv('METASEEK_CRON_SECRET', event) || readEnv('CRON_SECRET', event) || (isDevRuntime() ? expectedAdminToken(event) : '')
}

export function expectedIngestToken(event?: H3Event): string {
  return readEnv('METASEEK_INGEST_TOKEN', event) || defaultIngestToken()
}

export function extractBearer(event: H3Event): string {
  const header = getHeader(event, 'authorization') || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()
  return ''
}

export function extractBearerOrCookie(event: H3Event): string {
  return extractBearer(event) || (getCookie(event, ADMIN_COOKIE) || '').trim()
}

export function isAdmin(event: H3Event): boolean {
  const expected = expectedAdminToken(event)
  if (!expected) return false
  return extractBearerOrCookie(event) === expected
}

export function assertAdmin(event: H3Event) {
  if (!isAdmin(event)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}

export function assertInternal(event: H3Event) {
  const expected = expectedCronSecret(event)
  const token = extractBearer(event)
  if (!expected || token !== expected) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}

export function assertIngest(event: H3Event) {
  const expected = expectedIngestToken(event)
  const header = getHeader(event, 'authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!expected || token !== expected) {
    throw createError({ statusCode: 401, message: 'Unauthorized: Invalid Ingest Token' })
  }
}
