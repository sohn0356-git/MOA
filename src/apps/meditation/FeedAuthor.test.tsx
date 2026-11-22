// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {FeedAuthorDialog} from './FeedAuthor'
import {canUploadFaithPhoto} from './aiPhotoAccess'
const state=vi.hoisted(()=>({reads:[] as string[],stop:vi.fn()}))
vi.mock('../../services/faithSession',()=>({getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,p:string)=>p,query:(p:string)=>p,orderByChild:vi.fn(),equalTo:vi.fn(),limitToLast:vi.fn(),onValue:(p:string,cb:(s:{val:()=>unknown})=>void)=>{state.reads.push(p);cb({val:()=>({prayer:{uid:'alice',name:'Alice',title:'공유 기도제목',body:'함께 기도해 주세요',createdAt:123,updatedAt:123,answered:false}})});return state.stop}}))
const photo={id:'one',ownerUid:'alice',authorName:'Alice',imageUrl:'photo.jpg',caption:'Alice의 공개 묵상',selectedDate:'2026-11-22'}
beforeEach(()=>{state.reads=[];state.stop.mockClear();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}})
afterEach(cleanup)
it('shows only this author public posts and already shared prayers without reading private records',()=>{
 const view=render(<FeedAuthorDialog photo={photo} photos={[photo,{...photo,id:'two',ownerUid:'bob',caption:'다른 작성자'}]} viewerUid="viewer" onClose={vi.fn()}/>)
 expect(screen.getByRole('heading',{name:'Alice'})).toBeInTheDocument()
 expect(screen.getAllByText('Alice의 공개 묵상').length).toBeGreaterThan(0)
 expect(screen.queryByText('다른 작성자')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'기도제목'}))
 expect(screen.getByRole('heading',{name:'공유 기도제목'})).toBeInTheDocument()
 expect(state.reads).toEqual(['sanctuary/prayers'])
 view.unmount();expect(state.stop).toHaveBeenCalledOnce()
})
it('allows guests to see public posts but gates shared prayers with login',()=>{
 render(<FeedAuthorDialog photo={photo} photos={[photo]} viewerUid="" onClose={vi.fn()}/>)
 expect(screen.getAllByText('Alice의 공개 묵상').length).toBeGreaterThan(0)
 fireEvent.click(screen.getByRole('button',{name:'기도제목'}))
 expect(screen.getByText(/로그인 후 확인/)).toBeInTheDocument()
 expect(state.reads).toEqual([])
})
it('checks authenticated AI principals rather than a selected identity or AI-looking email',()=>{
 expect(canUploadFaithPhoto(null)).toBe(false)
 expect(canUploadFaithPhoto({uid:'ordinary',email:'ai01@moa-ai.app'})).toBe(false)
 expect(canUploadFaithPhoto({uid:'ai01'})).toBe(true)
 expect(canUploadFaithPhoto({uid:'ai10'})).toBe(true)
 expect(canUploadFaithPhoto({uid:'ai11'})).toBe(false)
})
