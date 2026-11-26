import { devotionShareId } from './devotionSharing'
import { isDevotionImage } from './devotionImage'
export type PublicDevotionImageTarget = { ownerUid: string; sourceEntryId: string; publicId: string }
export function collaborativeDevotionImageUpdates(target: PublicDevotionImageTarget, image: string): Record<string, string> {
  const { ownerUid, sourceEntryId, publicId } = target
  const badPath = ['.', '#', '$', '[', ']', '/'].some(char => (ownerUid + sourceEntryId).includes(char))
  if (!ownerUid || !sourceEntryId || badPath || publicId !== devotionShareId(ownerUid, sourceEntryId)) throw new Error('공개 묵상 정보를 확인하지 못했습니다.')
  if (image !== '' && !isDevotionImage(image)) throw new Error('사용할 수 없는 사진입니다.')
  return { ['users/' + ownerUid + '/meditationEntries/' + sourceEntryId + '/crossImage']: image, ['crossPhotos/' + publicId + '/imageUrl']: image }
}

export function collaborativeImageSaveUpdates(target:PublicDevotionImageTarget,image:string,actor:{uid:string;name:string},uploadId:string,createdAt:unknown):Record<string,unknown>{
 const updates:Record<string,unknown>=collaborativeDevotionImageUpdates(target,image)
 if(!image||actor.uid===target.ownerUid)return updates
 if(!/^ai(0[1-9]|10)$/.test(actor.uid)||!uploadId||/[.#$\[\]/]/.test(uploadId))throw Error('사진 업로드 정보를 확인해주세요.')
 const id=`image:${target.publicId}:${uploadId}`
 updates[`faithNotifications/${target.ownerUid}/${id}`]={kind:'image',actorUid:actor.uid,actorName:actor.name.slice(0,200)||'AI',ownerUid:target.ownerUid,targetId:target.publicId,entryId:target.sourceEntryId,sourceId:uploadId,title:'묵상 말씀 그림이 도착했어요',body:'묵상 말씀을 담은 그림을 확인해보세요.',createdAt}
 return updates
}
