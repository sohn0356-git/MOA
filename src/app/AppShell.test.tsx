// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import type {User} from 'firebase/auth'
import {useEffect,type ReactNode} from 'react'
import {AppShell} from './AppShell'
const boot=vi.hoisted(()=>({publish:true}))
const auth=vi.hoisted(()=>({
 user:null as User|null,authError:null as string|null,isAuthLoading:false,isAuthMutating:false,
 signInWithAiAccount:vi.fn().mockResolvedValue(undefined),signInWithEmail:vi.fn().mockResolvedValue(undefined),createEmailAccount:vi.fn().mockResolvedValue(undefined),
 signInWithGoogle:vi.fn().mockResolvedValue(undefined),signOutUser:vi.fn().mockResolvedValue(undefined)
}))
const activity=vi.hoisted(()=>({
 activityId:'',isLoading:false,isSwitching:false,error:'',selectActivity:vi.fn(),clearActivity:vi.fn()
}))
vi.mock('../hooks/useAuth',()=>({useAuth:()=>auth}))
vi.mock('../hooks/useFaithActivity',()=>({useFaithActivity:()=>activity}))
vi.mock('../hooks/useAppUpdate',()=>({useAppUpdate:()=>({hasUpdate:false,isUpdating:false,applyUpdate:vi.fn()})}))
vi.mock('../apps/meditation/MeditationApp',()=>({MeditationApp:({entryActions,profileActions,activityId,churchMember,onChurchSignIn,onStartupState}:{entryActions?:ReactNode;profileActions?:ReactNode;activityId?:string;churchMember?:{uid:string}|null;onChurchSignIn?:()=>Promise<unknown>;onStartupState?:(s:{owner:string;scripture:boolean;entries:boolean;feed:boolean})=>void})=>{
 useEffect(()=>{if(boot.publish)onStartupState?.({owner:activityId||churchMember?.uid||'guest',scripture:true,entries:true,feed:true})},[activityId,churchMember?.uid,onStartupState,boot.publish])
 return <section><h1>MOA</h1>{entryActions}{profileActions}<output aria-label="현재 활동 아이디">{activityId}</output><p>공개 신앙 앱</p><output aria-label="예배당 로그인 계정">{churchMember?.uid || '로그인 필요'}</output><button onClick={()=>void onChurchSignIn?.().catch(()=>{})}>예배당 로그인</button></section>
}}))
afterEach(cleanup)
beforeEach(()=>{
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
 boot.publish=true
 localStorage.clear();sessionStorage.clear();vi.clearAllMocks()
 auth.signInWithGoogle.mockReset().mockResolvedValue(undefined)
 auth.user=null;auth.authError=null;auth.isAuthLoading=false;auth.isAuthMutating=false
 activity.activityId='';activity.isLoading=false;activity.isSwitching=false;activity.error=''
 activity.selectActivity.mockReset().mockImplementation(async(id:string)=>{activity.activityId=id})
 activity.clearActivity.mockReset().mockImplementation(async()=>{activity.activityId=''})
 history.replaceState(null,'','/')
})
describe('Faith activity permissions and account controls',()=>{
 it('removes account selection while keeping Google login available',()=>{
  render(<AppShell/>)
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.getByRole('button',{name:'구글 로그인'})).toBeTruthy()
  expect(activity.selectActivity).not.toHaveBeenCalled()
 })
 it('clears both authenticated sessions on logout',async()=>{
  auth.user={uid:'google-owner',email:'owner@example.com'} as User
  activity.activityId='ai05'
  render(<AppShell/>)
  fireEvent.click(screen.getByRole('button',{name:'로그아웃'}))
  await waitFor(()=>expect(auth.signOutUser).toHaveBeenCalledOnce())
  expect(activity.clearActivity).toHaveBeenCalledOnce()
 })
 it('returns to personal permissions after Google login from AI activity',async()=>{
  activity.activityId='ai02'
  render(<AppShell/>)
  fireEvent.click(screen.getByRole('button',{name:'구글 로그인'}))
  await waitFor(()=>expect(activity.clearActivity).toHaveBeenCalledOnce())
  expect(auth.signInWithGoogle).toHaveBeenCalledOnce()
 })
 it('disables identity changes while permissions are being verified',()=>{
  activity.isSwitching=true;activity.activityId='ai03'
  render(<AppShell/>)
  expect(screen.queryByRole('combobox')).toBeNull()
  expect((screen.getByRole('button',{name:'구글 로그인'}) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText('AI 권한을 전환하고 있습니다…')).toBeTruthy()
 })
 it('shows a permission error without hiding the selected identity',()=>{
  activity.activityId='ai03';activity.error='권한 전환에 실패했습니다.'
  render(<AppShell/>)
  expect(screen.getByRole('alert').textContent).toContain('권한')
  expect(screen.queryByRole('combobox')).toBeNull()
 })
 it.each(['#/ai-city','#/apps','#/suggestions','#/timer','#/home/old','#/login'])('opens only Faith for the retired route %s',(route)=>{
  history.replaceState(null,'','/'+route);render(<AppShell/>)
  expect(screen.getByRole('main',{name:'MOA 메인'})).toBeTruthy()
  expect(location.hash).toBe('#/meditation')
  expect(screen.queryByText('공개 도시')).toBeNull()
 })
 it('opens Faith during account restoration and for the legacy root hash',()=>{
  auth.isAuthLoading=true;history.replaceState(null,'','/#/');render(<AppShell/>)
  expect(screen.getByRole('main',{name:'MOA 메인'})).toBeTruthy()
  expect(screen.getByText('공개 신앙 앱')).toBeTruthy()
 })
 it('keeps logout without the picker for a signed-in personal visitor',()=>{
  auth.user={uid:'u1',email:'person@example.com'} as User
  render(<AppShell/>)
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.getByRole('button',{name:'로그아웃'})).toBeTruthy()
  expect(screen.queryByRole('button',{name:'구글 로그인'})).toBeNull()
 })
 it('clears activity permissions from the account page logout as well',async()=>{
  auth.user={uid:'u1',email:'person@example.com'} as User;history.replaceState(null,'','/#/login')
  render(<AppShell/>)
  fireEvent.click(screen.getByRole('button',{name:'로그아웃'}))
  await waitFor(()=>expect(auth.signOutUser).toHaveBeenCalledOnce())
  expect(activity.clearActivity).toHaveBeenCalledOnce()
 })
})

it('uses primary account authentication for sanctuary access and clears AI activity after signing in',async()=>{
 activity.activityId='ai03'
 const view=render(<AppShell/>)
 expect(screen.getByLabelText('예배당 로그인 계정').textContent).toBe('로그인 필요')
 fireEvent.click(screen.getByRole('button',{name:'예배당 로그인'}));fireEvent.click(screen.getByRole('button',{name:'구글 계정으로 로그인'}))
 await waitFor(()=>expect(activity.clearActivity).toHaveBeenCalledOnce())
 expect(auth.signInWithGoogle).toHaveBeenCalledOnce()
 auth.user={uid:'google-member',displayName:'회원'} as User
 view.rerender(<AppShell/>)
 expect(screen.getByLabelText('예배당 로그인 계정').textContent).toBe('google-member')
})

it('shows a cute launch while restoring the account and releases it only when ready',()=>{
 auth.isAuthLoading=true;const view=render(<AppShell/>)
 expect(screen.getByRole('progressbar',{name:'앱 준비 진행률'}).getAttribute('value')).not.toBe('100')
 expect(screen.getByLabelText('MOA 시작 준비')).toBeTruthy()
 auth.isAuthLoading=false;view.rerender(<AppShell/>)
 expect(screen.queryByLabelText('MOA 시작 준비')).toBeNull()
 expect(screen.getByRole('main',{name:'MOA 메인'}).hasAttribute('inert')).toBe(false)
})
it('covers Google sign-in while pending and dismisses the launch after cancellation',async()=>{
 let reject:(e:Error)=>void=()=>{};auth.signInWithGoogle.mockImplementation(()=>new Promise((_resolve,r)=>{reject=r}))
 render(<AppShell/>);fireEvent.click(screen.getByRole('button',{name:'구글 로그인'}))
 expect(screen.getByLabelText('구글 로그인 준비')).toBeTruthy()
 reject(new Error('cancelled'))
 await waitFor(()=>expect(screen.queryByLabelText('구글 로그인 준비')).toBeNull())
 expect(activity.clearActivity).not.toHaveBeenCalled()
})
it('does not get stuck when Google returns the same account',async()=>{
 auth.user={uid:'member',displayName:'회원'} as User
 render(<AppShell/>);fireEvent.click(screen.getByRole('button',{name:'예배당 로그인'}));fireEvent.click(screen.getByRole('button',{name:'구글 계정으로 로그인'}))
 await waitFor(()=>expect(activity.clearActivity).toHaveBeenCalledOnce())
 await waitFor(()=>expect(screen.queryByLabelText('구글 로그인 준비')).toBeNull())
})

it('waits for the newly signed-in account content instead of reusing guest readiness',async()=>{
 let finish=()=>{};auth.signInWithGoogle.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}))
 const view=render(<AppShell/>);fireEvent.click(screen.getByRole('button',{name:'구글 로그인'}))
 boot.publish=false;auth.user={uid:'new-member',displayName:'새 회원'} as User;view.rerender(<AppShell/>)
 await act(async()=>finish())
 expect(screen.getByLabelText('구글 로그인 준비')).toBeTruthy();expect(screen.getByRole('progressbar').getAttribute('value')).not.toBe('100')
 boot.publish=true;view.rerender(<AppShell/>)
 await waitFor(()=>expect(screen.queryByLabelText('구글 로그인 준비')).toBeNull())
})

it('does not cover the app again after a same-tab refresh or remount',()=>{
 auth.isAuthLoading=true
 const view=render(<AppShell/>);expect(screen.getByLabelText('MOA 시작 준비')).toBeTruthy()
 view.unmount();render(<AppShell/>)
 expect(screen.queryByLabelText('MOA 시작 준비')).toBeNull()
 expect(screen.getByRole('main',{name:'MOA 메인'}).hasAttribute('inert')).toBe(false)
})
it('skips initial launch on reload even without a session marker',()=>{
 auth.isAuthLoading=true
 const getEntries=vi.spyOn(performance,'getEntriesByType').mockReturnValue([{type:'reload'}] as unknown as PerformanceEntry[])
 try{
  render(<AppShell/>)
  expect(screen.queryByLabelText('MOA 시작 준비')).toBeNull()
  expect(screen.getByRole('main',{name:'MOA 메인'}).hasAttribute('inert')).toBe(false)
 }finally{getEntries.mockRestore()}
})

it('offers email login alongside Google and clears AI activity only after successful authentication',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
 activity.activityId='ai03'
 render(<AppShell/>)
 expect(screen.getByRole('button',{name:'구글 로그인'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'이메일 로그인'}))
 fireEvent.change(screen.getByLabelText('이메일',{exact:true}),{target:{value:'person@example.com'}})
 fireEvent.change(screen.getByLabelText('비밀번호',{exact:true}),{target:{value:' password '}})
 fireEvent.click(screen.getByRole('button',{name:'이메일로 로그인'}))
 await waitFor(()=>expect(auth.signInWithEmail).toHaveBeenCalledWith('person@example.com',' password '))
 await waitFor(()=>expect(activity.clearActivity).toHaveBeenCalledOnce())
 expect(auth.signInWithGoogle).not.toHaveBeenCalled()
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'이메일 로그인'})).toBeNull())
})
