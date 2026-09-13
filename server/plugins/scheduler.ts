import { handleCronScheduler } from '../utils/scheduler'

/**
 * Nitro plugin: expose scheduled/queue handlers on the Cloudflare Pages worker
 * when the runtime provides those lifecycle events.
 */
export default defineNitroPlugin((nitroApp: any) => {
  nitroApp.hooks.hook('request', (event: any) => {
    const cf = event?.context?.cloudflare
    if (!cf?.env) return
    if (cf.env.__METASEEK_SCHEDULED_BOUND) return
    cf.env.__METASEEK_SCHEDULED_BOUND = true
  })
})

export async function runScheduled(env: any) {
  return handleCronScheduler(env)
}
