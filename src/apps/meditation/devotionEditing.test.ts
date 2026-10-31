import { describe, expect, it } from 'vitest'
import { normalizeDevotionFields, normalizeVerseNumbers } from './devotionEditing'
describe('old and Firebase-serialized devotion records', () => {
  it.each([undefined, null, {}, false, ''])('treats a missing verse selection as an empty list (%s)', value => {
    expect(normalizeVerseNumbers(value)).toEqual([])
  })
  it('restores indexed Firebase objects and retains supported verse key types', () => {
    expect(normalizeVerseNumbers({ 0: 1, 1: '2a' })).toEqual([1, '2a'])
    expect(normalizeVerseNumbers([1, null, false, '3', Number.NaN])).toEqual([1, '3'])
  })
  it('opens a partial legacy record with safe form values and private visibility', () => {
    const result = normalizeDevotionFields({ mind: null, selectedDate: 'not-a-date', selectedVerseNumbers: null }, '2026-10-31')
    expect(result).toMatchObject({ mind: '', apply: '', prayer: '', selectedDate: '2026-10-31', selectedVerseNumbers: [], audience: 'private' })
  })
  it('keeps the existing memo, verse text and cross picture while normalizing absent selection data', () => {
    const result = normalizeDevotionFields({ mind: '기존 묵상', verseText: '말씀 본문', crossImage: 'data:image/png;base64,AAAA', audience: 'public' }, '2026-10-31')
    expect(result.mind).toBe('기존 묵상')
    expect(result.verseText).toBe('말씀 본문')
    expect(result.crossImage).toBe('data:image/png;base64,AAAA')
    expect(result.audience).toBe('public')
  })
})
