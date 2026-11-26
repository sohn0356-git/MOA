// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SharedDevotionImageEditor } from './SharedDevotionImageEditor'
import { canApplyAppUpdate } from '../../lib/appUpdateProtocol'
const state=vi.hoisted(()=>({uid:'ai02',update:vi.fn()}))
vi.mock('../../services/faithSession',()=>({getFaithAuth:()=>({currentUser:{uid:state.uid}}),getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:()=>'/root',update:state.update,push:()=>({key:'upload'}),serverTimestamp:()=>123}))
vi.mock('./DevotionImagePicker',()=>({DevotionImagePicker:({onChange,disabled}:{onChange:(value:string)=>void;disabled:boolean})=><button disabled={disabled} onClick={()=>onChange('data:image/png;base64,BBBB')}>새 사진 선택</button>}))
const target={ownerUid:'alice',sourceEntryId:'entry',publicId:'devotion_alice_entry'}
const original='data:image/png;base64,AAAA'
beforeEach(()=>{localStorage.clear();state.uid='ai02';state.update.mockReset().mockResolvedValue(undefined)})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('saves the shared image, original image and author notification atomically',async()=>{
 const saved=vi.fn()
 render(<SharedDevotionImageEditor actorUid="ai02" target={target} image={original} onSaved={saved}/>)
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 사진 수정'}))
 fireEvent.click(screen.getByRole('button',{name:'새 사진 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'사진 수정 저장'}))
 await waitFor(()=>expect(saved).toHaveBeenCalledWith('data:image/png;base64,BBBB'))
 expect(state.update).toHaveBeenCalledWith('/root',{
  'users/alice/meditationEntries/entry/crossImage':'data:image/png;base64,BBBB',
  'crossPhotos/devotion_alice_entry/imageUrl':'data:image/png;base64,BBBB',
  'faithNotifications/alice/image:devotion_alice_entry:upload':{kind:'image',actorUid:'ai02',actorName:'ai02',ownerUid:'alice',targetId:'devotion_alice_entry',entryId:'entry',sourceId:'upload',title:'묵상 사진이 도착했어요',body:'AI가 내 묵상에 사진을 담았어요.',createdAt:123},
 })
 expect(Object.keys(localStorage).filter(key=>key.startsWith('moa.faith.sharedImageDraft'))).toHaveLength(0)
})
it('keeps an image draft after a permission failure or refresh and blocks updates during edits',async()=>{
 state.update.mockRejectedValueOnce(new Error('permission denied'))
 const first=render(<SharedDevotionImageEditor actorUid="ai02" target={target} image={original} onSaved={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 사진 수정'}))
 fireEvent.click(screen.getByRole('button',{name:'새 사진 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'사진 수정 저장'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('사진을 저장하지 못했습니다')
 expect(screen.getByRole('button',{name:'사진 수정 저장'})).toBeEnabled()
 // The editor protects the durable draft while an application update is offered.
 let permitted=true
 act(()=>{permitted=canApplyAppUpdate()})
 expect(permitted).toBe(false)
 first.unmount()
 render(<SharedDevotionImageEditor actorUid="ai02" target={target} image={original} onSaved={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 사진 수정'}))
 expect(screen.getByRole('status')).toHaveTextContent('임시저장한 사진 수정을 복원')
 expect(screen.getByRole('button',{name:'사진 수정 저장'})).toBeEnabled()
})
it('refuses to submit after the activity identity changes',()=>{
 state.uid='ai03'
 render(<SharedDevotionImageEditor actorUid="ai02" target={target} image={original} onSaved={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 사진 수정'}))
 fireEvent.click(screen.getByRole('button',{name:'새 사진 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'사진 수정 저장'}))
 expect(state.update).not.toHaveBeenCalled()
 expect(screen.getByRole('alert')).toHaveTextContent('활동 계정')
})
