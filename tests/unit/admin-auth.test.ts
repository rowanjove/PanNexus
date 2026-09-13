import { describe, it, expect } from 'vitest'
import { defaultAdminToken, defaultIngestToken } from '../../server/utils/env'
import { isResourceBlocked } from '../../server/core/ingest/blocked'

describe('Admin & ingest token defaults', () => {
  it('does not invent production tokens from empty env', () => {
    if (!process.env.METASEEK_ADMIN_TOKEN) {
      const token = defaultAdminToken()
      expect(token === '' || token === 'metaseek_admin_dev').toBe(true)
    }
    if (!process.env.METASEEK_INGEST_TOKEN) {
      const token = defaultIngestToken()
      expect(token === '' || token === 'metaseek_secret_ingest_token_2025').toBe(true)
    }
  })

  it('blocked helper stays conservative on empty values', () => {
    expect(isResourceBlocked({ title: 'ok' }, [{ type: 'keyword', value: '  ' }])).toBe(false)
  })
})
