import { describe, expect, it } from 'vitest'
import { buildPersonalFeed } from './personalFeed'
import { devotionShareUpdates, type ShareableDevotion } from './devotionSharing'
import { DEFAULT_FEED_GROUP, normalizeFeedGroup } from './feedGroups'
const own: ShareableDevotion & { authorUid: string; createdAt: string } = {
 id:'a',authorUid:'alice',createdAt:'2026-11-06T01:00:00Z',selectedDate:'2026-11-06',audience:'private',
 mind:'비공개 원문',apply:'',reference:'요한복음',verseText:'말씀',groupName:'함께 묵상'
}
describe('public groups and personal feed isolation', () => {
 it('keeps my public and private posts together, excludes other owners and deduplicates shares', () => {
  const entries = [own, {...own,id:'b',audience:'public' as const}, {...own,id:'c',authorUid:'bob'}]
  const shared = {id:'devotion_alice_b',ownerUid:'alice',imageUrl:'',caption:'공유 복사',createdAt:own.createdAt,selectedDate:own.selectedDate,storagePath:''}
  const result = buildPersonalFeed([shared,{...shared,id:'other',ownerUid:'bob'}],entries,'alice')
  expect(result).toHaveLength(2)
  expect(result.find(p=>p.sourceEntryId==='a')?.audience).toBe('private')
  expect(result.filter(p=>p.sourceEntryId==='b')).toHaveLength(1)
  expect(result.every(p=>p.ownerUid==='alice')).toBe(true)
  expect(devotionShareUpdates('alice',own,null)).toEqual({})
 })
 it('isolates account changes and guest drafts', () => {
  expect(buildPersonalFeed([], [own], 'bob')).toEqual([])
  expect(buildPersonalFeed([], [own])).toEqual([])
  expect(buildPersonalFeed([], [{...own,authorUid:undefined}])).toHaveLength(1)
  expect(buildPersonalFeed([], [{...own,authorUid:undefined}],'bob')).toEqual([])
 })
 it('stores an explicit public group in the shared record while migrating the old default label', () => {
  const updates=devotionShareUpdates('alice',{...own,audience:'public'},null)
  expect(updates['crossPhotos/devotion_alice_a/groupName']).toBe('함께 묵상')
  expect(normalizeFeedGroup('미분류')).toBe(DEFAULT_FEED_GROUP)
  expect(DEFAULT_FEED_GROUP).toBe('전체 공개')
 })
})
