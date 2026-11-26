// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {FaithNotificationCenter} from './FaithNotificationCenter'
import type {FaithConnections} from './useFaithConnections'
const state=vi.hoisted(()=>({set:vi.fn().mockResolvedValue(undefined),items:{comment:{kind:'comment',actorUid:'bob',actorName:'Bob',title:'묵상에 댓글이 달렸어요',body:'Bob: 평안해요',targetId:'post',createdAt:200},prayer:{kind:'intercession',actorUid:'bob',actorName:'Bob',title:'함께 기도하는 마음이 도착했어요',body:'기도했어요',targetId:'prayer',createdAt:100}}}))
vi.mock('../../services/faithSession',()=>({getFaithAuth:()=>({currentUser:{uid:'alice'}}),getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,path:string)=>path,query:(r:string)=>r,orderByChild:vi.fn(),limitToLast:vi.fn(),serverTimestamp:()=>300,set:state.set,onValue:(_ref:string,cb:(s:{val:()=>unknown})=>void)=>{cb({val:()=>_ref.includes('activityNotificationReads')?null:state.items});return()=>{}}}))
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};state.set.mockClear();state.items.comment.kind='comment';state.items.comment.title='묵상에 댓글이 달렸어요';Reflect.deleteProperty(state.items.comment,'entryId')})
afterEach(cleanup)
const social={uid:'alice',notices:[],unread:[]} as unknown as FaithConnections
it('shows incoming post and prayer activity and persists read status before opening the post',async()=>{
 const open=vi.fn();render(<FaithNotificationCenter social={social} preferences={{friends:true,chapel:true}} onFriends={vi.fn()} onOpen={open}/>)
 fireEvent.click(screen.getByRole('button',{name:'알림 2개'}));fireEvent.click(screen.getByRole('button',{name:/묵상에 댓글이 달렸어요/}))
 await waitFor(()=>expect(state.set).toHaveBeenCalledWith('users/alice/activityNotificationReads/comment',300));expect(open).toHaveBeenCalledWith(expect.objectContaining({targetId:'post'}))
})
it('honors independent activity and chapel preferences',()=>{
 render(<FaithNotificationCenter social={social} preferences={{friends:true,chapel:false,activity:false}} onFriends={vi.fn()} onOpen={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'알림'}));expect(screen.getByText('아직 받은 알림이 없어요.')).toBeInTheDocument()
})

it('opens the author’s original devotion when an AI image notice is selected',async()=>{
 Object.assign(state.items.comment,{kind:'image',entryId:'entry',title:'묵상 사진이 도착했어요'})
 const open=vi.fn();render(<FaithNotificationCenter social={social} preferences={{friends:true,chapel:true}} onFriends={vi.fn()} onOpen={open}/>)
 fireEvent.click(screen.getByRole('button',{name:'알림 2개'}));fireEvent.click(screen.getByRole('button',{name:/묵상 사진이 도착했어요/}))
 await waitFor(()=>expect(open).toHaveBeenCalledWith(expect.objectContaining({kind:'image',entryId:'entry'})))
})
