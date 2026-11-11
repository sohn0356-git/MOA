import { expect, it } from 'vitest'
import { collaborativeDevotionImageUpdates } from './collaborativeDevotionImage'
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
