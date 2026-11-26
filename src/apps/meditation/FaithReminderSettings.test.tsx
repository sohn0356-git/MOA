// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {FaithReminderSettings} from './FaithReminderSettings'
const state=vi.hoisted(()=>({raw:null as unknown,listener:null as ((s:{val:()=>unknown})=>void)|null,uid:'alice',fail:false,permission:'default' as NotificationPermission,request:vi.fn()}))
vi.mock('../../services/faithSession',()=>({getFaithAuth:()=>({currentUser:{uid:state.uid}}),getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,p:string)=>p,serverTimestamp:()=>123,onValue:(_p:string,cb:(s:{val:()=>unknown})=>void)=>{state.listener=cb;cb({val:()=>state.raw});return()=>{state.listener=null}},runTransaction:async(_p:string,updater:(v:unknown)=>unknown)=>{if(state.fail)throw Error('저장하지 못했습니다.');const next=updater(state.raw);if(next!==undefined){state.raw=next;state.listener?.({val:()=>state.raw})}return{committed:next!==undefined}}}))
vi.mock('./reminderPush',()=>({enrollReminderPush:async()=>false}))
beforeEach(()=>{state.uid='alice';state.raw=null;state.fail=false;state.permission='default';state.request.mockReset().mockImplementation(async()=>{state.permission='granted';return 'granted'});vi.stubGlobal('Notification',{get permission(){return state.permission},requestPermission:state.request})})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('permission grant enables a saved daily 07:00 alarm without a push server',async()=>{
 render(<FaithReminderSettings uid="alice"/>);fireEvent.click(screen.getByRole('button',{name:'알림 권한 허용'}))
 await waitFor(()=>expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toHaveAttribute('aria-checked','true'))
 expect(screen.getByRole('button',{name:'07:00 매일 알림 수정'})).toBeInTheDocument();expect(state.raw).toMatchObject({version:2,enabled:true,schedules:{morning:{time:'07:00',enabled:true}}})
 expect(screen.getByText(/앱을 완전히 닫은 뒤/)).toBeInTheDocument()
})
it('adds and edits multiple weekly alarms, daily labels and individual switches',async()=>{
 state.permission='granted';render(<FaithReminderSettings uid="alice"/>)
 fireEvent.click(screen.getByRole('switch',{name:'묵상 시간 알림'}));await screen.findByRole('button',{name:'07:00 매일 알림 수정'})
 fireEvent.click(screen.getByRole('button',{name:/알림 추가/}));fireEvent.change(screen.getByLabelText('묵상 알림 시간'),{target:{value:'21:30'}})
 const days=screen.getByRole('group',{name:'알림 요일'});for(const name of ['화요일','목요일','토요일','일요일'])fireEvent.click(within(days).getByRole('button',{name}))
 fireEvent.click(screen.getByRole('button',{name:'알림 저장'}));await screen.findByRole('button',{name:'21:30 월·수·금 알림 수정'})
 expect(screen.getByRole('button',{name:'07:00 매일 알림 수정'})).toBeInTheDocument()
 fireEvent.click(screen.getByRole('switch',{name:'21:30 알림'}));await waitFor(()=>expect(screen.getByRole('switch',{name:'21:30 알림'})).toHaveAttribute('aria-checked','false'))
 fireEvent.click(screen.getByRole('button',{name:'21:30 월·수·금 알림 수정'}));fireEvent.click(within(screen.getByRole('group',{name:'알림 요일'})).getByRole('button',{name:'매일'}));fireEvent.click(screen.getByRole('button',{name:'알림 저장'}));await screen.findByRole('button',{name:'21:30 매일 알림 수정'})
 fireEvent.click(screen.getByRole('button',{name:'07:00 알림 삭제'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'07:00 매일 알림 수정'})).toBeNull())
})
it('does not save a reminder with no selected weekdays',()=>{
 state.permission='granted';render(<FaithReminderSettings uid="alice"/>);fireEvent.click(screen.getByRole('button',{name:/알림 추가/}));for(const name of ['월요일','화요일','수요일','목요일','금요일','토요일','일요일'])fireEvent.click(screen.getByRole('button',{name}));expect(screen.getByRole('button',{name:'알림 저장'})).toBeDisabled();expect(state.raw).toBeNull()
})
it('preserves edits and shows a readable error if saving fails',async()=>{
 state.permission='granted';render(<FaithReminderSettings uid="alice"/>);fireEvent.click(screen.getByRole('button',{name:/알림 추가/}));fireEvent.change(screen.getByLabelText('묵상 알림 시간'),{target:{value:'09:15'}});state.fail=true;fireEvent.click(screen.getByRole('button',{name:'알림 저장'}));expect(await screen.findByRole('alert')).toHaveTextContent('저장하지 못했습니다');expect(screen.getByLabelText('묵상 알림 시간')).toHaveValue('09:15')
})
it('keeps account schedules protected for guests while allowing device permission',()=>{
 state.uid='';render(<FaithReminderSettings uid=""/>);expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toBeDisabled();expect(screen.getByRole('button',{name:/알림 추가/})).toBeDisabled();expect(screen.getByRole('button',{name:'알림 권한 허용'})).toBeEnabled()
})
