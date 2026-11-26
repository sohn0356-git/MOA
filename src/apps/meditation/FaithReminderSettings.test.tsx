// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {FaithReminderSettings} from './FaithReminderSettings'
const state=vi.hoisted(()=>({saved:null as {enabled:boolean;time:string;timezone:string}|null,listener:null as ((s:{val:()=>unknown})=>void)|null,call:vi.fn(),permission:vi.fn().mockResolvedValue('granted'),fail:false,ready:true}))
vi.mock('../../services/faithSession',()=>({getFaithAuth:()=>({currentUser:{uid:'alice'},app:{}}),getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,p:string)=>p,onValue:(_p:string,cb:(s:{val:()=>unknown})=>void)=>{state.listener=cb;cb({val:()=>state.saved});return()=>{state.listener=null}}}))
vi.mock('firebase/functions',()=>({getFunctions:()=>({}),httpsCallable:(_f:unknown,name:string)=>async(data:Record<string,unknown>)=>{state.call(name,data);if(name==='faithPushKey')return{data:{publicKey:'AAAA',scheduledReady:state.ready}};if(state.fail)throw Error('서버 설정을 저장하지 못했습니다.');state.saved={enabled:!!data.enabled,time:String(data.time),timezone:String(data.timezone)};state.listener?.({val:()=>state.saved});return{data:state.saved}}}))
beforeEach(()=>{state.saved=null;state.fail=false;state.ready=true;state.call.mockClear();state.permission.mockClear();vi.stubGlobal('Notification',{requestPermission:state.permission});vi.stubGlobal('PushManager',class{});Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{ready:Promise.resolve({pushManager:{getSubscription:async()=>({options:{},toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/example',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}})})}})}})})
afterEach(()=>{cleanup();vi.unstubAllGlobals();Reflect.deleteProperty(navigator,'serviceWorker')})
it('requests device permission and persists the selected daily time on the server',async()=>{
 render(<FaithReminderSettings uid="alice"/>);await waitFor(()=>expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toBeEnabled());fireEvent.change(screen.getByLabelText('묵상 알림 시간'),{target:{value:'06:45'}});fireEvent.click(screen.getByRole('switch',{name:'묵상 시간 알림'}))
 await waitFor(()=>expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toHaveAttribute('aria-checked','true'))
 expect(state.permission).toHaveBeenCalledOnce();expect(state.call).toHaveBeenCalledWith('configureFaithReminder',expect.objectContaining({enabled:true,time:'06:45',subscription:expect.objectContaining({endpoint:expect.stringContaining('fcm.googleapis.com')})}))
})
it('disables a saved reminder without asking for permission again',async()=>{
 state.saved={enabled:true,time:'07:00',timezone:'Asia/Seoul'};render(<FaithReminderSettings uid="alice"/>);fireEvent.click(screen.getByRole('switch',{name:'묵상 시간 알림'}));await waitFor(()=>expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toHaveAttribute('aria-checked','false'));expect(state.permission).not.toHaveBeenCalled()
})
it('does not show a reminder as enabled when server persistence fails',async()=>{
 state.fail=true;render(<FaithReminderSettings uid="alice"/>);await waitFor(()=>expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toBeEnabled());fireEvent.click(screen.getByRole('switch',{name:'묵상 시간 알림'}));expect(await screen.findByRole('alert')).toHaveTextContent('저장하지 못했습니다');expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toHaveAttribute('aria-checked','false')
})
it('keeps reminder permission controls disabled for guests',()=>{
 render(<FaithReminderSettings uid=""/>);expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toBeDisabled();expect(screen.getByLabelText('묵상 알림 시간')).toBeDisabled();expect(state.permission).not.toHaveBeenCalled()
})

it('keeps scheduled alerts disabled until the server scheduler is verified',async()=>{
 state.ready=false;render(<FaithReminderSettings uid="alice"/>)
 expect(await screen.findByText(/예약 푸시 서버 설정이 아직 완료되지/)).toBeInTheDocument()
 expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toBeDisabled()
 expect(screen.getByLabelText('묵상 알림 시간')).toBeDisabled()
 expect(state.permission).not.toHaveBeenCalled()
})

it('can request device permission while the scheduling server is unavailable',async()=>{
 state.ready=false;render(<FaithReminderSettings uid="alice"/>)
 await screen.findByText(/예약 푸시 서버 설정이 아직 완료되지/)
 fireEvent.click(screen.getByRole('button',{name:'알림 권한 허용'}))
 expect(await screen.findByText('이 기기의 알림 권한을 허용했어요.')).toBeInTheDocument()
 expect(state.permission).toHaveBeenCalledOnce()
 expect(state.call.mock.calls.some(([name])=>name==='configureFaithReminder')).toBe(false)
 expect(screen.getByRole('switch',{name:'묵상 시간 알림'})).toBeDisabled()
})
