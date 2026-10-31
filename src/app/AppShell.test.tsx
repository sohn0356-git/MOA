// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import type {User} from 'firebase/auth'
import type {ReactNode} from 'react'
import {AppShell} from './AppShell'
const auth=vi.hoisted(()=>({
 user:null as User|null,authError:null as string|null,isAuthLoading:false,isAuthMutating:false,
 signInWithAiAccount:vi.fn().mockResolvedValue(undefined),signInWithEmail:vi.fn().mockResolvedValue(undefined),
 signInWithGoogle:vi.fn().mockResolvedValue(undefined),signOutUser:vi.fn().mockResolvedValue(undefined)
}))
const activity=vi.hoisted(()=>({
 activityId:'',isLoading:false,isSwitching:false,error:'',selectActivity:vi.fn(),clearActivity:vi.fn()
}))
vi.mock('../hooks/useAuth',()=>({useAuth:()=>auth}))
vi.mock('../hooks/useFaithActivity',()=>({useFaithActivity:()=>activity}))
vi.mock('../hooks/useAppUpdate',()=>({useAppUpdate:()=>({hasUpdate:false,isUpdating:false,applyUpdate:vi.fn()})}))
vi.mock('../apps/meditation/MeditationApp',()=>({MeditationApp:({entryActions,activityId}:{entryActions?:ReactNode;activityId?:string})=><section><h1>MOA Faith</h1>{entryActions}<output aria-label="현재 활동 아이디">{activityId}</output><p>공개 신앙 앱</p></section>}))
vi.mock('../apps/ai-city/AiCityApp',()=>({AiCityApp:({entryActions}:{entryActions?:ReactNode})=><section><h1>Ai city</h1>{entryActions}<p>공개 도시</p></section>}))
vi.mock('../apps/registry',()=>({appRegistry:[
 {id:'ai-city',name:'Ai city',route:'#/ai-city',component:()=>null},
 {id:'sample',name:'Sample',route:'#/sample',component:()=><h2>Sample content</h2>}
]}))
vi.mock('../components/AppGrid',()=>({AppGrid:({onOpenApp}:{onOpenApp:(route:string)=>void})=><button onClick={()=>onOpenApp('#/sample')}>Sample 열기</button>}))
afterEach(cleanup)
beforeEach(()=>{
 localStorage.clear();vi.clearAllMocks()
 auth.user=null;auth.authError=null;auth.isAuthLoading=false;auth.isAuthMutating=false
 activity.activityId='';activity.isLoading=false;activity.isSwitching=false;activity.error=''
 activity.selectActivity.mockReset().mockImplementation(async(id:string)=>{activity.activityId=id})
 activity.clearActivity.mockReset().mockImplementation(async()=>{activity.activityId=''})
 history.replaceState(null,'','/')
})
function go(hash:string){act(()=>{window.location.hash=hash;window.dispatchEvent(new HashChangeEvent('hashchange'))})}
describe('Faith activity permissions and account controls',()=>{
 it('requests AI permissions while keeping the dropdown and separate Google login available',()=>{
  const view=render(<AppShell/>)
  fireEvent.change(screen.getByRole('combobox',{name:'활동 아이디 선택'}),{target:{value:'ai03'}})
  expect(activity.selectActivity).toHaveBeenCalledWith('ai03')
  expect(auth.signInWithAiAccount).not.toHaveBeenCalled()
  expect(auth.signInWithGoogle).not.toHaveBeenCalled()
  view.rerender(<AppShell/>)
  expect((screen.getByRole('combobox',{name:'활동 아이디 선택'}) as HTMLSelectElement).value).toBe('ai03')
  expect(screen.getByRole('button',{name:'구글 로그인'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'로그아웃'})).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox',{name:'활동 아이디 선택'}),{target:{value:'ai07'}})
  expect(activity.selectActivity).toHaveBeenLastCalledWith('ai07')
 })
 it('preserves the Google account when selecting AI and clears both sessions on logout',async()=>{
  auth.user={uid:'google-owner',email:'owner@example.com'} as User
  const view=render(<AppShell/>)
  fireEvent.change(screen.getByRole('combobox',{name:'활동 아이디 선택'}),{target:{value:'ai05'}})
  view.rerender(<AppShell/>)
  expect(auth.user.uid).toBe('google-owner')
  expect(auth.signOutUser).not.toHaveBeenCalled()
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
  expect((screen.getByRole('combobox',{name:'활동 아이디 선택'}) as HTMLSelectElement).disabled).toBe(true)
  expect((screen.getByRole('button',{name:'구글 로그인'}) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText('AI 권한을 전환하고 있습니다…')).toBeTruthy()
 })
 it('shows a permission error without hiding the selected identity',()=>{
  activity.activityId='ai03';activity.error='권한 전환에 실패했습니다.'
  render(<AppShell/>)
  expect(screen.getByRole('alert').textContent).toContain('권한')
  expect((screen.getByRole('combobox',{name:'활동 아이디 선택'}) as HTMLSelectElement).value).toBe('ai03')
 })
 it('keeps explicit AI City links available',()=>{
  history.replaceState(null,'','/#/ai-city');render(<AppShell/>)
  expect(screen.getByText('공개 도시')).toBeTruthy()
  expect(screen.getByRole('link',{name:'로그인'})).toBeTruthy()
 })
 it('opens Faith during account restoration and for the legacy root hash',()=>{
  auth.isAuthLoading=true;history.replaceState(null,'','/#/');render(<AppShell/>)
  expect(screen.getByRole('main',{name:'MOA Faith 메인'})).toBeTruthy()
  expect(screen.getByText('공개 신앙 앱')).toBeTruthy()
 })
 it('keeps the picker and logout for a signed-in personal visitor',()=>{
  auth.user={uid:'u1',email:'person@example.com'} as User
  render(<AppShell/>)
  expect(screen.getByRole('combobox',{name:'활동 아이디 선택'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'로그아웃'})).toBeTruthy()
  expect(screen.queryByRole('button',{name:'구글 로그인'})).toBeNull()
 })
 it('retains protection for other apps',()=>{
  const view=render(<AppShell/>);go('#/apps')
  expect(screen.getByRole('tab',{name:'Google 로그인'})).toBeTruthy()
  auth.user={uid:'u1',email:'person@example.com'} as User;view.rerender(<AppShell/>)
  expect(screen.getByRole('heading',{name:'Apps'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Sample 열기'}))
  act(()=>window.dispatchEvent(new HashChangeEvent('hashchange')))
  expect(screen.getByRole('heading',{name:'Sample content'})).toBeTruthy()
 })
 it('clears activity permissions from the account page logout as well',async()=>{
  auth.user={uid:'u1',email:'person@example.com'} as User;history.replaceState(null,'','/#/login')
  render(<AppShell/>)
  fireEvent.click(screen.getByRole('button',{name:'로그아웃'}))
  await waitFor(()=>expect(auth.signOutUser).toHaveBeenCalledOnce())
  expect(activity.clearActivity).toHaveBeenCalledOnce()
 })
})
