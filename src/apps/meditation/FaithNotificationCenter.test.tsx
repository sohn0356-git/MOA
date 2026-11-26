// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {FaithNotificationCenter} from './FaithNotificationCenter'
import type {FaithConnections} from './useFaithConnections'
const state=vi.hoisted(()=>({update:vi.fn().mockResolvedValue(undefined),reads:{} as Record<string,number>,emit:null as null|((s:{val:()=>unknown})=>void),set:vi.fn().mockResolvedValue(undefined),items:{comment:{kind:'comment',actorUid:'bob',actorName:'Bob',title:'묵상에 댓글이 달렸어요',body:'Bob: 평안해요',targetId:'post',createdAt:200},prayer:{kind:'intercession',actorUid:'bob',actorName:'Bob',title:'함께 기도하는 마음이 도착했어요',body:'기도했어요',targetId:'prayer',createdAt:100}}}))
vi.mock('../../services/faithSession',()=>({getFaithAuth:()=>({currentUser:{uid:'alice'}}),getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,path:string)=>path,query:(r:string)=>r,orderByChild:vi.fn(),limitToLast:vi.fn(),serverTimestamp:()=>300,set:state.set,update:state.update,onValue:(_ref:string,cb:(s:{val:()=>unknown})=>void)=>{if(!_ref.includes('activityNotificationReads'))state.emit=cb;cb({val:()=>_ref.includes('activityNotificationReads')?state.reads:state.items});return()=>{}}}))
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};state.set.mockClear();state.reads={};state.update.mockReset().mockImplementation(async(_path:string,values:Record<string,number>)=>{Object.assign(state.reads,values)});state.items.comment.kind='comment';state.items.comment.title='묵상에 댓글이 달렸어요';state.items.comment.body='Bob: 평안해요';state.items.comment.actorName='Bob';Reflect.deleteProperty(state.items.comment,'entryId')})
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
 fireEvent.click(screen.getByRole('button',{name:'알림 2개'}));fireEvent.click(screen.getByRole('button',{name:/묵상 말씀 그림이 도착했어요/}))
 await waitFor(()=>expect(open).toHaveBeenCalledWith(expect.objectContaining({kind:'image',entryId:'entry'})))
})

it('marks the visible inbox read on opening and keeps the badge cleared after closing and remounting',async()=>{
 const props={social,preferences:{friends:true,chapel:true},onFriends:vi.fn(),onOpen:vi.fn()};const view=render(<FaithNotificationCenter {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'알림 2개'}));await waitFor(()=>expect(state.update).toHaveBeenCalledWith('users/alice/activityNotificationReads',{comment:300,prayer:300}));expect(screen.getByRole('button',{name:'알림'})).toBeInTheDocument();expect(screen.queryByLabelText('읽지 않음')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'알림 닫기'}));expect(screen.getByRole('button',{name:'알림'})).toBeInTheDocument();view.unmount();render(<FaithNotificationCenter {...props}/>);expect(screen.getByRole('button',{name:'알림'})).toBeInTheDocument()
})
it('hides AI identity and old wording even for an existing image notice',()=>{
 Object.assign(state.items.comment,{kind:'image',actorName:'AI01',body:'AI01이 그림을 그렸어요',title:'이전 알림'});render(<FaithNotificationCenter social={social} preferences={{friends:true,chapel:true}} onFriends={vi.fn()} onOpen={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'알림 2개'}));expect(screen.getByText('묵상 말씀 그림이 도착했어요')).toBeInTheDocument();expect(screen.queryByText(/AI01/)).toBeNull()
})
it('marks friend notifications read when opening without accepting a request',async()=>{
 const friend={id:'request',from:'bob',to:'alice',fromName:'Bob',toName:'Alice',updatedAt:50,status:'pending'},markRead=vi.fn().mockResolvedValue(undefined);render(<FaithNotificationCenter social={{...social,notices:[friend],unread:[friend],markRead} as unknown as FaithConnections} preferences={{friends:true,chapel:false,activity:false}} onFriends={vi.fn()} onOpen={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'알림 1개'}));await waitFor(()=>expect(markRead).toHaveBeenCalledWith(friend));expect(screen.getByRole('button',{name:'알림'})).toBeInTheDocument()
})

it('only shows a badge again for a newly arrived notification',async()=>{
 render(<FaithNotificationCenter social={social} preferences={{friends:true,chapel:true}} onFriends={vi.fn()} onOpen={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'알림 2개'}));await waitFor(()=>expect(state.update).toHaveBeenCalled());fireEvent.click(screen.getByRole('button',{name:'알림 닫기'}));act(()=>state.emit?.({val:()=>({...state.items,fresh:{...state.items.comment,createdAt:400}})}));expect(screen.getByRole('button',{name:'알림 1개'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'알림 1개'}));await waitFor(()=>expect(state.update).toHaveBeenCalledWith('users/alice/activityNotificationReads',{fresh:300}));expect(screen.getByRole('button',{name:'알림'})).toBeInTheDocument()
})

it('reports a read-save failure and retries when the inbox is opened again',async()=>{
 state.update.mockRejectedValueOnce(Error('offline'));render(<FaithNotificationCenter social={social} preferences={{friends:true,chapel:true}} onFriends={vi.fn()} onOpen={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'알림 2개'}));await screen.findByRole('alert');expect(screen.getByRole('button',{name:'알림 2개'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'알림 닫기'}));fireEvent.click(screen.getByRole('button',{name:'알림 2개'}));await waitFor(()=>expect(state.update).toHaveBeenCalledTimes(2));expect(screen.getByRole('button',{name:'알림'})).toBeInTheDocument()
})
