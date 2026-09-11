import { describe, it, expect } from 'vitest'
import { processCrawlJob } from '../../server/queues/crawl-consumer'
import { handleCronScheduler } from '../../server/utils/scheduler'

describe('Queue & Crawl Scheduler System', () => {
  it('processes crawl job and returns newly crawled resources with cursor', async () => {
    const mockQueue: any[] = []
    const mockEnv = {
      CRAWL_QUEUE: {
        send: async (msg: any) => mockQueue.push(msg)
      }
    }

    const result = await processCrawlJob({ type: 'crawl_source', sourceId: 'pan_index', cursor: 'page_1' }, mockEnv)

    expect(result.inserted).toBe(2)
    expect(result.nextCursor).toBe('page_2')
    expect(mockQueue.length).toBe(1)
    expect(mockQueue[0].cursor).toBe('page_2')
  })

  it('cron scheduler enumerates crawl adapters and dispatches queue jobs', async () => {
    const mockQueue: any[] = []
    const mockEnv = {
      CRAWL_QUEUE: {
        send: async (msg: any) => mockQueue.push(msg)
      }
    }

    const { enqueued } = await handleCronScheduler(mockEnv)

    expect(enqueued).toBeGreaterThan(0)
    expect(mockQueue.some(job => job.sourceId === 'pan_index')).toBe(true)
  })
})
