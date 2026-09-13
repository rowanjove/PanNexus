import { defineEventHandler, deleteCookie } from 'h3'
import { ADMIN_COOKIE } from '../../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
  return { success: true }
})
