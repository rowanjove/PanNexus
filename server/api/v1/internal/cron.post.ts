import { defineEventHandler } from 'h3'
import { assertInternal } from '../../../utils/admin-auth'
import { handleCronScheduler } from '../../../utils/scheduler'
import { getCloudflareEnv } from '../../../utils/env'

export default defineEventHandler(async (event) => {
  assertInternal(event)
  const env = getCloudflareEnv(event)
  const result = await handleCronScheduler(env)
  return { success: true, ...result }
})
