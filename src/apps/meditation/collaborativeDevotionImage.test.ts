import { expect, it } from 'vitest'
import { collaborativeDevotionImageUpdates,collaborativeImageSaveUpdates } from './collaborativeDevotionImage'
const target={ownerUid:'alice',sourceEntryId:'entry',publicId:'devotion_alice_entry'}
it('changes only the two picture leaves and never copies private text or authorship',()=>{
 expect(collaborativeDevotionImageUpdates(target,'data:image/png;base64,AAAA')).toEqual({
 'users/alice/meditationEntries/entry/crossImage':'data:image/png;base64,AAAA',
 'crossPhotos/devotion_alice_entry/imageUrl':'data:image/png;base64,AAAA',
 })
 expect(Object.values(collaborativeDevotionImageUpdates(target,''))).toEqual(['',''])
})
it('rejects path injection, mismatched projections and unsupported images',()=>{
 expect(()=>collaborativeDevotionImageUpdates({...target,ownerUid:'alice/other'},'')).toThrow()
 expect(()=>collaborativeDevotionImageUpdates({...target,publicId:'other'},'')).toThrow()
 expect(()=>collaborativeDevotionImageUpdates(target,'https://example.com/photo.svg')).toThrow()
})

it('adds an owner notification to the same image update without sharing image bytes in the notice',()=>{
 const result=collaborativeImageSaveUpdates(target,'data:image/png;base64,AAAA',{uid:'ai02',name:'AI 02'},'upload',123)
 expect(Object.keys(result)).toHaveLength(3)
 expect(result['faithNotifications/alice/image:devotion_alice_entry:upload']).toEqual({kind:'image',ownerUid:'alice',actorUid:'ai02',actorName:'AI 02',targetId:'devotion_alice_entry',entryId:'entry',sourceId:'upload',title:'묵상 말씀 그림이 도착했어요',body:'묵상 말씀을 담은 그림을 확인해보세요.',createdAt:123})
})
it('does not notify for removal or saving an image on the AI account’s own post',()=>{
 expect(Object.keys(collaborativeImageSaveUpdates(target,'',{uid:'ai02',name:'AI'},'upload',123))).toHaveLength(2)
 expect(Object.keys(collaborativeImageSaveUpdates({...target,ownerUid:'ai02',publicId:'devotion_ai02_entry'},'data:image/png;base64,AAAA',{uid:'ai02',name:'AI'},'upload',123))).toHaveLength(2)
 expect(()=>collaborativeImageSaveUpdates(target,'data:image/png;base64,AAAA',{uid:'regular',name:'누군가'},'upload',123)).toThrow()
})
