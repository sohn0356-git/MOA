import { devotionShareId } from './devotionSharing'
import { isDevotionImage } from './devotionImage'
export type PublicDevotionImageTarget = { ownerUid: string; sourceEntryId: string; publicId: string }
export function collaborativeDevotionImageUpdates(target: PublicDevotionImageTarget, image: string): Record<string, string> {
  const { ownerUid, sourceEntryId, publicId } = target
  const badPath = ['.', '#', '$', '[', ']', '/'].some(char => (ownerUid + sourceEntryId).includes(char))
  if (!ownerUid || !sourceEntryId || badPath || publicId !== devotionShareId(ownerUid, sourceEntryId)) throw new Error('공개 묵상 정보를 확인하지 못했습니다.')
  if (image !== '' && !isDevotionImage(image)) throw new Error('사용할 수 없는 그림입니다.')
  return { ['users/' + ownerUid + '/meditationEntries/' + sourceEntryId + '/crossImage']: image, ['crossPhotos/' + publicId + '/imageUrl']: image }
}
