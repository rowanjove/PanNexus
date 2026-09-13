import { defineEventHandler, readBody } from 'h3'
import { assertInternal } from '../../../utils/admin-auth'
import { processCrawlJob, type CrawlJob } from '../../../queues/crawl-consumer'
import { getCloudflareEnv } from '../../../utils/env'

export default defineEventHandler(async (event) => {
  assertInternal(event)
  const body = await readBody(event)
  const job: CrawlJob = {
    type: 'crawl_source',
    sourceId: String(body?.sourceId || body?.source_id || ''),
    cursor: body?.cursor,
    attempt: Number(body?.attempt || 0)
  }
  if (!job.sourceId) {
    return { success: false, error: 'sourceId required' }
  }
  const result = await processCrawlJob(job, getCloudflareEnv(event))
  return { success: true, ...result }
})
