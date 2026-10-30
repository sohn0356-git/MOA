import { describe, expect, it, vi } from 'vitest'
import { deleteSharedDevotion, devotionShareId, devotionShareUpdates, persistSharedDevotion, type ShareableDevotion } from './devotionSharing'
const entry: ShareableDevotion = { id: 'entry1', audience: 'public', mind: '오늘의 묵상', apply: '이웃 돌보기', prayer: '평안을 주소서', verseText: '서로 사랑하라', reference: '요한복음 13:34', selectedDate: '2026-10-30', crossImage: 'data:image/png;base64,AAAA' }
const id = devotionShareId('alice', entry.id), base = 'crossPhotos/' + id
describe('cross-tab devotion sharing', () => {
  it('commits the original and shared text/image together in one atomic update', async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    await persistSharedDevotion('alice', entry, { ...entry, authorUid: 'alice' }, async () => null, commit)
    expect(commit).toHaveBeenCalledOnce()
    const updates = commit.mock.calls[0][0]
    expect(updates['users/alice/meditationEntries/entry1'].mind).toBe(entry.mind)
    expect(updates[base + '/ownerUid']).toBe('alice')
    expect(updates[base + '/sourceEntryId']).toBe('entry1')
    expect(updates[base + '/caption']).toContain(entry.verseText)
    expect(updates[base + '/caption']).toContain(entry.mind)
    expect(updates[base + '/caption']).toContain(entry.apply)
    expect(updates[base + '/caption']).toContain(entry.prayer)
    expect(updates[base + '/imageUrl']).toBe(entry.crossImage)
  })
  it('supports text-only posts and removes a replaced picture while preserving reactions and comments', () => {
    const updates = devotionShareUpdates('alice', { ...entry, crossImage: undefined, mind: '바꾼 묵상' }, { createdAt: '2026-10-29T01:00:00Z' })
    expect(updates[base + '/caption']).toContain('바꾼 묵상')
    expect(updates[base + '/imageUrl']).toBe('')
    expect(updates[base + '/createdAt']).toBe('2026-10-29T01:00:00Z')
    expect(Object.keys(updates).some(path => /comment|prayerCount/.test(path))).toBe(false)
  })
  it.each(['private', 'group'] as const)('withdraws the public projection when scope changes to %s', scope => {
    expect(devotionShareUpdates('alice', { ...entry, audience: scope }, { createdAt: 'old' })).toEqual({ [base]: null })
    expect(devotionShareUpdates('alice', { ...entry, audience: scope }, null)).toEqual({})
  })
  it('does not commit the original if verifying the existing shared post fails', async () => {
    const commit = vi.fn()
    await expect(persistSharedDevotion('alice', entry, {}, async () => { throw new Error('offline') }, commit)).rejects.toThrow('offline')
    expect(commit).not.toHaveBeenCalled()
  })
  it('propagates atomic save failure so the editor retains its draft', async () => {
    await expect(persistSharedDevotion('alice', entry, {}, async () => null, async () => { throw new Error('permission denied') })).rejects.toThrow('permission denied')
  })
  it('deletes source and shared post together without attempting to erase other authors’ comments', async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    await deleteSharedDevotion('alice', entry.id, async () => ({ ownerUid: 'alice' }), commit)
    expect(commit).toHaveBeenCalledWith({ 'users/alice/meditationEntries/entry1': null, [base]: null })
    commit.mockClear()
    await deleteSharedDevotion('alice', entry.id, async () => null, commit)
    expect(commit).toHaveBeenCalledWith({ 'users/alice/meditationEntries/entry1': null })
  })
})
