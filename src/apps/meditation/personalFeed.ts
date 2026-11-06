import { devotionShareId, getDevotionCaption, type ShareableDevotion } from './devotionSharing'
import { normalizeFeedGroup } from './feedGroups'
import { isDevotionImage } from './devotionImage'
export type FeedPhoto = {
  id: string; publicId?: string; ownerUid?: string; authorUid?: string; authorName?: string; authorAvatarUrl?: string
  activityId?: string; sourceType?: 'devotion'; sourceEntryId?: string; audience?: 'public' | 'private' | 'group'
  imageUrl: string; caption: string; createdAt: string; selectedDate: string; storagePath: string; groupName?: string
}
type Entry = ShareableDevotion & { authorUid?: string; createdAt: string }
export function buildPersonalFeed(photos: FeedPhoto[], entries: Entry[], uid?: string): FeedPhoto[] {
  const result = new Map<string, FeedPhoto>()
  for (const photo of photos) {
    if (uid && (photo.ownerUid === uid || !photo.ownerUid && photo.authorUid === uid)) result.set(photo.publicId || photo.id, photo)
  }
  for (const entry of entries) {
    if (uid ? entry.authorUid !== uid : Boolean(entry.authorUid)) continue
    const id = devotionShareId(uid || 'guest', entry.id)
    result.set(id, {
      id, publicId: id, ownerUid: uid, authorUid: uid, authorName: entry.authorName, authorAvatarUrl: entry.authorAvatarUrl,
      activityId: entry.activityId, sourceType: 'devotion', sourceEntryId: entry.id, audience: entry.audience,
      groupName: normalizeFeedGroup(entry.groupName), imageUrl: isDevotionImage(entry.crossImage) ? entry.crossImage : '',
      caption: getDevotionCaption(entry), createdAt: entry.createdAt, selectedDate: entry.selectedDate, storagePath: '',
    })
  }
  return [...result.values()].sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
