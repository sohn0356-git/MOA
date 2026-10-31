// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import type {User} from 'firebase/auth'
import type {ReactNode} from 'react'
import {AppShell} from './AppShell'
const auth=vi.hoisted(()=>({
 user:null as User|null,authError:null as string|null,isAuthLoading:false,isAuthMutating:false,
 signInWithAiAccount:vi.fn().mockResolvedValue(undefined),signInWithEmail:vi.fn().mockResolvedValue(undefined),signInWithGoogle:vi.fn().mockResolvedValue(undefined),signOutUser:vi.fn().mockResolvedValue(undefined)
}))
vi.mock('../hooks/useAuth',()=>({useAuth:()=>auth}))
vi.mock('../hooks/useAppUpdate',()=>({useAppUpdate:()=>({hasUpdate:false,isUpdating:false,applyUpdate:vi.fn()})}))
vi.mock('../apps/meditation/MeditationApp',()=>({MeditationApp:({entryActions,activityId}:{entryActions?:ReactNode;activityId?:string})=><section><h1>MOA Faith</h1>{entryActions}<output aria-label="현재 활동 아이디">{activityId}</output><p>공개 신앙 앱</p></section>}))
vi.mock('../apps/ai-city/AiCityApp',()=>({AiCityApp:({entryActions}:{entryActions?:ReactNode})=><section><h1>Ai city</h1>{entryActions}<p>공개 도시</p></section>}))
vi.mock('../apps/registry',()=>({appRegistry:[
 {id:'ai-city',name:'Ai city',route:'#/ai-city',component:()=>null},
 {id:'sample',name:'Sample',route:'#/sample',component:()=><h2>Sample content</h2>}
]}))
vi.mock('../components/AppGrid',()=>({AppGrid:({onOpenApp}:{onOpenApp:(route:string)=>void})=><button onClick={()=>onOpenApp('#/sample')}>Sample 열기</button>}))
afterEach(cleanup)
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();auth.user=null;auth.authError=null;auth.isAuthLoading=false;auth.isAuthMutating=false;history.replaceState(null,'','/')})
function go(hash:string){act(()=>{window.location.hash=hash;window.dispatchEvent(new HashChangeEvent('hashchange'))})}
describe('MOA Faith main entry',()=>{
 it('keeps the picker after login and provides logout directly in the Faith header',()=>{
  const view=render(<AppShell/>)
  fireEvent.change(screen.getByRole('combobox',{name:'활동 아이디 선택'}),{target:{value:'ai02'}})
  auth.user={uid:'google-owner',email:'owner@example.com'} as User
  view.rerender(<AppShell/>)
  expect((screen.getByRole('combobox',{name:'활동 아이디 선택'}) as HTMLSelectElement).value).toBe('ai02')
  fireEvent.change(screen.getByRole('combobox',{name:'활동 아이디 선택'}),{target:{value:'ai05'}})
  expect(auth.user.uid).toBe('google-owner')
  expect(auth.signInWithAiAccount).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'로그아웃'}))
  expect(auth.signOutUser).toHaveBeenCalledOnce()
 })

 it('keeps Google login next to the compact AI picker',()=>{
  render(<AppShell/>)
  const picker=screen.getByRole('combobox',{name:'활동 아이디 선택'})
  const google=screen.getByRole('button',{name:'구글 로그인'})
  expect(picker.parentElement).toBe(google.parentElement)
  fireEvent.click(google)
  expect(auth.signInWithGoogle).toHaveBeenCalledOnce()
 })
 it('keeps identity selection independent while Google sign-in is pending',()=>{
  auth.isAuthMutating=true
  render(<AppShell/>)
  expect((screen.getByRole('combobox',{name:'활동 아이디 선택'}) as HTMLSelectElement).disabled).toBe(false)
  expect((screen.getByRole('button',{name:'구글 로그인'}) as HTMLButtonElement).disabled).toBe(true)
 })

 it('lets a guest select an AI account without leaving Faith',()=>{
  render(<AppShell/>)
  const picker=screen.getByRole('combobox',{name:'활동 아이디 선택'})
  fireEvent.change(picker,{target:{value:'ai03'}})
  expect(auth.signInWithAiAccount).not.toHaveBeenCalled()
  expect(auth.signInWithGoogle).not.toHaveBeenCalled()
  expect((picker as HTMLSelectElement).value).toBe('ai03')
  expect(screen.getByLabelText('현재 활동 아이디').textContent).toBe('ai03')
  fireEvent.change(picker,{target:{value:'ai07'}})
  expect((picker as HTMLSelectElement).value).toBe('ai07')
  expect(screen.getByText('공개 신앙 앱')).toBeTruthy()
 })
 it('keeps explicit AI City links available',()=>{
  history.replaceState(null,'','/#/ai-city')
  render(<AppShell/>)
  expect(screen.getByText('공개 도시')).toBeTruthy()
  expect(screen.getByRole('link',{name:'로그인'})).toBeTruthy()
 })

 it('opens public Faith and keeps the activity picker available while authentication loads',()=>{
  auth.isAuthLoading=true;auth.authError='Firebase configuration is missing: example'
  render(<AppShell/>)
  expect(screen.getByRole('main',{name:'MOA Faith 메인'})).toBeTruthy()
  expect(screen.getByText('공개 신앙 앱')).toBeTruthy()
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.queryByRole('region',{name:'로그인'})).toBeNull()
  expect((screen.getByRole('combobox',{name:'활동 아이디 선택'}) as HTMLSelectElement).disabled).toBe(false)
  expect(auth.signInWithGoogle).not.toHaveBeenCalled()
 })
 it('keeps Faith as the main app for signed-in users and the legacy root hash',()=>{
  auth.user={uid:'u1',email:'person@example.com'} as User
  history.replaceState(null,'','/#/')
  render(<AppShell/>)
  expect(screen.getByText('공개 신앙 앱')).toBeTruthy()
  expect(screen.getByRole('combobox',{name:'활동 아이디 선택'})).toBeTruthy()
  expect(screen.getByRole('button',{name:'로그아웃'})).toBeTruthy()
  expect(screen.queryByRole('button',{name:'구글 로그인'})).toBeNull()
  expect(screen.queryByRole('heading',{name:'Apps'})).toBeNull()
 })
 it('opens login only after navigation and returns to the city without signing in',()=>{
  render(<AppShell/>);go('#/login')
  expect(screen.getByRole('tab',{name:'Google 로그인'})).toBeTruthy()
  expect(screen.queryByText('공개 신앙 앱')).toBeNull()
  expect(screen.getByRole('link',{name:'← AI City로 돌아가기'}).getAttribute('href')).toBe('#/ai-city')
  go('#/ai-city')
  expect(screen.getByText('공개 도시')).toBeTruthy()
  expect(screen.queryByRole('tablist')).toBeNull()
 })
 it('retains login protection for MOA apps and opens the requested app after login',()=>{
  const result=render(<AppShell/>);go('#/apps')
  expect(screen.getByRole('tab',{name:'Google 로그인'})).toBeTruthy()
  expect(screen.queryByRole('heading',{name:'Apps'})).toBeNull()
  auth.user={uid:'u1',email:'person@example.com'} as User
  result.rerender(<AppShell/>)
  expect(screen.getByRole('heading',{name:'Apps'})).toBeTruthy()
  expect(screen.getByRole('link',{name:'← AI City로 돌아가기'}).getAttribute('href')).toBe('#/ai-city')
  fireEvent.click(screen.getByRole('button',{name:'Sample 열기'}))
  act(()=>window.dispatchEvent(new HashChangeEvent('hashchange')))
  expect(screen.getByRole('heading',{name:'Sample content'})).toBeTruthy()
  go('#/apps');expect(screen.getByRole('heading',{name:'Apps'})).toBeTruthy()
 })
 it('shows account actions for an already signed-in visitor on the login route',()=>{
  auth.user={uid:'u1',email:'person@example.com'} as User;history.replaceState(null,'','/#/login')
  render(<AppShell/>)
  expect(screen.getByRole('region',{name:'내 계정'})).toBeTruthy()
  expect(screen.getByRole('link',{name:'MOA 앱 열기'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'로그아웃'}))
  expect(auth.signOutUser).toHaveBeenCalledOnce()
 })
})
