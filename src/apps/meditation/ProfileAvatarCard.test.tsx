// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {ProfileAvatarCard} from './ProfileAvatarCard'
import {applyAvatarPreset,defaultAvatar} from './sanctuaryCommunity'
const store=vi.hoisted(()=>({values:{} as Record<string,unknown>,listeners:new Map<string,Set<(s:{val:()=>unknown})=>void>>(),writes:vi.fn(),fail:false}))
vi.mock('../../services/firebase',()=>({getRealtimeDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,path:string)=>path,onValue:(path:string,fn:(s:{val:()=>unknown})=>void)=>{if(!store.listeners.has(path))store.listeners.set(path,new Set());store.listeners.get(path)!.add(fn);fn({val:()=>store.values[path]??null});return()=>store.listeners.get(path)?.delete(fn)},set:async(path:string,value:unknown)=>{store.writes(path,value);if(store.fail)throw Error('offline');store.values[path]=value;store.listeners.get(path)?.forEach(fn=>fn({val:()=>value}))}}))
beforeEach(()=>{store.values={};store.listeners.clear();store.writes.mockClear();store.fail=false})
afterEach(cleanup)
it('loads the chapel avatar and edits the same primary UID rather than a separate photo profile',async()=>{
 store.values['sanctuary/avatars/alice']=applyAvatarPreset(defaultAvatar('하늘'),'lavender')
 const view=render(<ProfileAvatarCard member={{uid:'alice',displayName:'Alice'}}/>)
 expect(screen.getByRole('heading',{name:'하늘'})).toBeInTheDocument()
 expect(screen.getByRole('img',{name:'프로필의 내 아바타'})).toHaveAttribute('data-gender','female')
 expect(screen.queryByRole('button',{name:'프로필 편집'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'아바타 편집'}))
 expect(screen.getAllByRole('button',{name:/샘플 선택/})).toHaveLength(6)
 fireEvent.click(screen.getByRole('button',{name:'구름 샘플 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'캐릭터 저장'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(store.writes).toHaveBeenCalledWith('sanctuary/avatars/alice',expect.objectContaining({name:'하늘',gender:'female',hair:5}))
 expect(screen.getByRole('img',{name:'프로필의 내 아바타'}).getAttribute('style')).toContain('#d9cabc')
 const changed=applyAvatarPreset(defaultAvatar('예배당에서 변경'),'ocean')
 act(()=>store.listeners.get('sanctuary/avatars/alice')!.forEach(fn=>fn({val:()=>changed})))
 expect(screen.getByRole('heading',{name:'예배당에서 변경'})).toBeInTheDocument()
 view.rerender(<ProfileAvatarCard member={{uid:'bob',displayName:'Bob'}}/>)
 expect(screen.queryByText('예배당에서 변경')).toBeNull();expect(screen.getByRole('heading',{name:'Bob'})).toBeInTheDocument()
})
it('keeps the editor and selected appearance after a failed save',async()=>{
 render(<ProfileAvatarCard member={{uid:'alice',displayName:'Alice'}}/>);store.fail=true
 fireEvent.click(screen.getByRole('button',{name:'아바타 편집'}));fireEvent.click(screen.getByRole('button',{name:'바다 샘플 선택'}));fireEvent.click(screen.getByRole('button',{name:'캐릭터 저장'}))
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('저장하지 못했습니다'))
 expect(screen.getByRole('dialog')).toBeInTheDocument();expect(screen.getByRole('button',{name:'바다 샘플 선택'})).toHaveAttribute('aria-pressed','true')
})
it('requires primary login before loading or changing a chapel avatar',()=>{
 render(<ProfileAvatarCard member={null}/>)
 expect(screen.getByRole('button',{name:'로그인하고 아바타 보기'})).toBeDisabled()
 expect(store.listeners.size).toBe(0);expect(store.writes).not.toHaveBeenCalled()
})
