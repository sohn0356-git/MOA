// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SharedDevotionImageEditor } from './SharedDevotionImageEditor'
import { canApplyAppUpdate } from '../../lib/appUpdateProtocol'
const state=vi.hoisted(()=>({uid:'bob',update:vi.fn()}))
vi.mock('../../services/faithSession',()=>({getFaithAuth:()=>({currentUser:{uid:state.uid}}),getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:()=>'/root',update:state.update}))
vi.mock('./DevotionImagePicker',()=>({DevotionImagePicker:({onChange,disabled}:{onChange:(value:string)=>void;disabled:boolean})=><button disabled={disabled} onClick={()=>onChange('data:image/png;base64,BBBB')}>새 그림 선택</button>}))
const target={ownerUid:'alice',sourceEntryId:'entry',publicId:'devotion_alice_entry'}
const original='data:image/png;base64,AAAA'
beforeEach(()=>{localStorage.clear();state.uid='bob';state.update.mockReset().mockResolvedValue(undefined)})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('lets another authenticated actor save only the shared and original image leaves',async()=>{
 const saved=vi.fn()
 render(<SharedDevotionImageEditor actorUid="bob" target={target} image={original} onSaved={saved}/>)
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 그림 수정'}))
 fireEvent.click(screen.getByRole('button',{name:'새 그림 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'그림 수정 저장'}))
 await waitFor(()=>expect(saved).toHaveBeenCalledWith('data:image/png;base64,BBBB'))
 expect(state.update).toHaveBeenCalledWith('/root',{
  'users/alice/meditationEntries/entry/crossImage':'data:image/png;base64,BBBB',
  'crossPhotos/devotion_alice_entry/imageUrl':'data:image/png;base64,BBBB',
 })
 expect(Object.keys(localStorage).filter(key=>key.startsWith('moa.faith.sharedImageDraft'))).toHaveLength(0)
})
it('keeps an image draft after a permission failure or refresh and blocks updates during edits',async()=>{
 state.update.mockRejectedValueOnce(new Error('permission denied'))
 const first=render(<SharedDevotionImageEditor actorUid="bob" target={target} image={original} onSaved={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 그림 수정'}))
 fireEvent.click(screen.getByRole('button',{name:'새 그림 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'그림 수정 저장'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('그림을 저장하지 못했습니다')
 expect(screen.getByRole('button',{name:'그림 수정 저장'})).toBeEnabled()
 // The editor protects the durable draft while an application update is offered.
 let permitted=true
 act(()=>{permitted=canApplyAppUpdate()})
 expect(permitted).toBe(false)
 first.unmount()
 render(<SharedDevotionImageEditor actorUid="bob" target={target} image={original} onSaved={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 그림 수정'}))
 expect(screen.getByRole('status')).toHaveTextContent('임시저장한 그림 수정을 복원')
 expect(screen.getByRole('button',{name:'그림 수정 저장'})).toBeEnabled()
})
it('refuses to submit after the activity identity changes',()=>{
 state.uid='other'
 render(<SharedDevotionImageEditor actorUid="bob" target={target} image={original} onSaved={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'공개 묵상 그림 수정'}))
 fireEvent.click(screen.getByRole('button',{name:'새 그림 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'그림 수정 저장'}))
 expect(state.update).not.toHaveBeenCalled()
 expect(screen.getByRole('alert')).toHaveTextContent('활동 계정')
})
