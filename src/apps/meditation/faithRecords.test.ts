import { describe, expect, it } from 'vitest'
import { mergeFaithRecords } from './faithRecords'
describe('saved AI edits', () => {
  it('shows the saved edited record once instead of bringing back its generated original', () => {
    const saved = { id: 'ai-entry-date-ai03', mind: '수정한 글', createdAt: '2026-10-31' }
    const original = { ...saved, mind: '예시 원본' }
    const result = mergeFaithRecords([saved], [original, { id: 'other-ai', mind: '다른 예시', createdAt: '2026-10-30' }])
    expect(result).toHaveLength(2)
    expect(result[0].mind).toBe('수정한 글')
  })
})
