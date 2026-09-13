import { defineEventHandler, readBody, setCookie, createError } from 'h3'
import { ADMIN_COOKIE, expectedAdminToken } from '../../../utils/admin-auth'
import { isDevRuntime } from '../../../utils/env'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = String(body?.token || '').trim()
  const expected = expectedAdminToken(event)
  if (!expected || token !== expected) {
    throw createError({ statusCode: 401, message: 'Invalid admin token' })
  }

  setCookie(event, ADMIN_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    secure: !isDevRuntime()
  })

  return { success: true }
})
