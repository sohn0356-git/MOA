import { isDevotionImage } from './devotionImage'

export type ShareableDevotion = {
  id: string; audience: 'private' | 'public' | 'group'; mind: string; apply: string; prayer?: string
  verseText: string; reference: string; selectedDate: string; crossImage?: string
  authorName?: string; authorAvatarUrl?: string
}
export function devotionShareId(uid: string, entryId: string) { return 'devotion_' + uid + '_' + entryId }
export function devotionShareUpdates(uid: string, entry: ShareableDevotion, previous: { createdAt?: string } | null, now = new Date().toISOString()): Record<string, unknown> {
  const id = devotionShareId(uid, entry.id), base = 'crossPhotos/' + id
  if (entry.audience !== 'public') return previous ? { [base]: null } : {}
  const caption = [
    entry.reference, entry.verseText, entry.mind.trim() ? '묵상\n' + entry.mind.trim() : '',
    entry.apply.trim() ? '오늘의 적용\n' + entry.apply.trim() : '', entry.prayer?.trim() ? '기도\n' + entry.prayer.trim() : '',
  ].filter(Boolean).join('\n\n')
  const payload = {
    ownerUid: uid, authorUid: uid, authorName: entry.authorName || 'MOA 사용자', authorAvatarUrl: entry.authorAvatarUrl || '',
    sourceType: 'devotion', sourceEntryId: entry.id, publicId: id,
    createdAt: previous?.createdAt || now, selectedDate: entry.selectedDate, updatedAt: now,
    caption, imageUrl: isDevotionImage(entry.crossImage) ? entry.crossImage : '', storagePath: '',
  }
  // Update content leaves rather than replacing the shared record: other people's comments and reaction counts survive edits.
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [base + '/' + key, value]))
}
export async function persistSharedDevotion(
  uid: string, entry: ShareableDevotion, source: Record<string, unknown>,
  readShare: (id: string) => Promise<{ createdAt?: string } | null>,
  commit: (updates: Record<string, unknown>) => Promise<void>,
) {
  const previous = await readShare(devotionShareId(uid, entry.id))
  await commit({
    ['users/' + uid + '/meditationEntries/' + entry.id]: source,
    ...devotionShareUpdates(uid, entry, previous),
  })
}
export async function deleteSharedDevotion(
  uid: string, entryId: string,
  readShare: (id: string) => Promise<unknown>,
  commit: (updates: Record<string, unknown>) => Promise<void>,
) {
  const id = devotionShareId(uid, entryId)
  const existing = await readShare(id)
  await commit({ ['users/' + uid + '/meditationEntries/' + entryId]: null, ...(existing ? { ['crossPhotos/' + id]: null } : {}) })
}
