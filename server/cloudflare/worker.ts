/// <reference types="@cloudflare/workers-types" />

/**
 * Dedicated Cloudflare Worker for Cron + Queue consumption.
 * It does not bundle Nuxt; it HTTP-calls the Pages/Nitro app so adapter aliases resolve there.
 *
 * Deploy: wrangler deploy --config wrangler.crawler.jsonc
 */
export interface CrawlerEnv {
  APP_URL: string
  METASEEK_CRON_SECRET?: string
  CRON_SECRET?: string
  CRAWL_QUEUE?: { send(msg: unknown): Promise<void> }
}

async function postJson(env: CrawlerEnv, path: string, body?: unknown) {
  const secret = env.METASEEK_CRON_SECRET || env.CRON_SECRET || ''
  const res = await fetch(`${env.APP_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : '{}'
  })
  if (!res.ok) {
    throw new Error(`crawler proxy ${path} failed: ${res.status}`)
  }
  return res
}

export default {
  async scheduled(_event: ScheduledEvent, env: CrawlerEnv, ctx: ExecutionContext) {
    ctx.waitUntil(postJson(env, '/api/v1/internal/cron'))
  },

  async queue(batch: MessageBatch<{ sourceId?: string; source_id?: string; cursor?: string; attempt?: number }>, env: CrawlerEnv) {
    for (const msg of batch.messages) {
      try {
        await postJson(env, '/api/v1/internal/queue', msg.body || {})
        msg.ack()
      } catch {
        msg.retry()
      }
    }
  }
}
