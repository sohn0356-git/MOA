// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {FriendRequestButton,ConnectionHub,NotificationSwitches} from './FaithConnections'
import type {FaithConnections} from './useFaithConnections'
vi.mock('./FeedAuthor',()=>({SyncedAuthorAvatar:()=> <span>아바타</span>}))
const request={id:'bob__alice',from:'bob',to:'alice',fromName:'Bob',toName:'Alice',status:'pending' as const,createdAt:1,updatedAt:2}
function social(){return{uid:'alice',loaded:true,error:'',requests:[request],notices:[request],unread:[request],friends:[],groups:[],relationship:vi.fn(),retry:vi.fn(),send:vi.fn().mockResolvedValue(undefined),respond:vi.fn().mockResolvedValue(undefined),cancel:vi.fn().mockResolvedValue(undefined),markRead:vi.fn().mockResolvedValue(undefined),createGroup:vi.fn().mockResolvedValue(undefined)} as unknown as FaithConnections}
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}})
afterEach(cleanup)
it('sends a request from the author profile and never allows self requests',async()=>{
 const state=social(),view=render(<FriendRequestButton social={state} target="bob" name="Bob"/>)
 fireEvent.click(screen.getByRole('button',{name:'친구 요청'}))
 await waitFor(()=>expect(state.send).toHaveBeenCalledWith('bob','Bob'))
 expect(screen.getByRole('status')).toHaveTextContent('친구 요청을 보냈습니다')
 view.rerender(<FriendRequestButton social={state} target="alice" name="Alice"/>)
 expect(screen.queryByRole('button')).toBeNull()
})
it('offers acceptance for incoming requests and cancellation only for outgoing requests',async()=>{
 const state=social();vi.mocked(state.relationship).mockReturnValue(request)
 render(<FriendRequestButton social={state} target="bob" name="Bob"/>)
 fireEvent.click(screen.getByRole('button',{name:'친구 요청 수락'}))
 await waitFor(()=>expect(state.respond).toHaveBeenCalledWith(request,true))
 expect(state.send).not.toHaveBeenCalled()
})
it('shows received notifications, marks a selected request read and opens management',async()=>{
 const state=social()
 render(<ConnectionHub kind="bell" social={state} notifications={[request]} enabled/>)
 fireEvent.click(screen.getByRole('button',{name:'알림 1개'}))
 fireEvent.click(screen.getByRole('button',{name:/Bob 친구 요청을 보냈어요/}))
 await waitFor(()=>expect(state.markRead).toHaveBeenCalledWith(request))
 expect(await screen.findByRole('dialog',{name:'친구 관리'})).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'수락'}))
 await waitFor(()=>expect(state.respond).toHaveBeenCalledWith(request,true))
})
it('keeps group creation in my records and hides the notification badge when disabled',async()=>{
 const state=social()
 const view=render(<ConnectionHub social={state} notifications={[request]} enabled={false}/>)
 fireEvent.click(screen.getByRole('button',{name:/친구 관리/}))
 fireEvent.change(screen.getByRole('textbox',{name:'새 친구 그룹 이름'}),{target:{value:'가족'}})
 fireEvent.submit(screen.getByRole('button',{name:'만들기'}).closest('form')!)
 await waitFor(()=>expect(state.createGroup).toHaveBeenCalledWith('가족'))
 view.unmount();render(<ConnectionHub kind="bell" social={state} notifications={[request]} enabled={false}/>)
 expect(screen.getByRole('button',{name:'알림'})).toBeInTheDocument()
 expect(screen.queryByRole('button',{name:'알림 1개'})).toBeNull()
})
it('provides independent friend and sanctuary switches and waits for persisted values',async()=>{
 const toggle=vi.fn().mockResolvedValue(undefined)
 const view=render(<NotificationSwitches values={{friends:true,chapel:false}} loaded error="" toggle={toggle} loggedIn/>)
 expect(screen.getByRole('switch',{name:'친구 알림'})).toHaveAttribute('aria-checked','true')
 expect(screen.getByRole('switch',{name:'예배당 알림'})).toHaveAttribute('aria-checked','false')
 fireEvent.click(screen.getByRole('switch',{name:'친구 알림'}))
 await waitFor(()=>expect(toggle).toHaveBeenCalledWith('friends'))
 view.rerender(<NotificationSwitches values={{friends:false,chapel:false}} loaded error="" toggle={toggle} loggedIn/>)
 expect(screen.getByRole('switch',{name:'친구 알림'})).toHaveAttribute('aria-checked','false')
})

it('provides friend acceptance and group creation inline without another dialog',async()=>{
 const state=social()
 render(<ConnectionHub kind="inline" social={state} notifications={[]} enabled/>)
 expect(screen.getByRole('region',{name:'친구 관리'})).toBeInTheDocument()
 expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'수락'}))
 await waitFor(()=>expect(state.respond).toHaveBeenCalledWith(request,true))
 fireEvent.change(screen.getByRole('textbox',{name:'새 친구 그룹 이름'}),{target:{value:'중보 친구'}})
 await waitFor(()=>expect(screen.getByRole('button',{name:'만들기'})).toBeEnabled())
 fireEvent.click(screen.getByRole('button',{name:'만들기'}))
 await waitFor(()=>expect(state.createGroup).toHaveBeenCalledWith('중보 친구'))
})
it('offers login instead of editable friend controls to guests in the friends tab',async()=>{
 const state={...social(),uid:''},login=vi.fn().mockResolvedValue(undefined)
 render(<ConnectionHub kind="inline" social={state} notifications={[]} enabled onSignIn={login}/>)
 expect(screen.queryByRole('textbox',{name:'새 친구 그룹 이름'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'로그인하고 친구 관리'}))
 await waitFor(()=>expect(login).toHaveBeenCalledOnce())
})
