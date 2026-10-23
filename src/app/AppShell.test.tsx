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
vi.mock('../apps/ai-city/AiCityApp',()=>({AiCityApp:({entryActions}:{entryActions?:ReactNode})=><section><h1>Ai city</h1>{entryActions}<p>공개 도시</p></section>}))
vi.mock('../apps/registry',()=>({appRegistry:[
 {id:'ai-city',name:'Ai city',route:'#/ai-city',component:()=>null},
 {id:'sample',name:'Sample',route:'#/sample',component:()=><h2>Sample content</h2>}
]}))
vi.mock('../components/AppGrid',()=>({AppGrid:({onOpenApp}:{onOpenApp:(route:string)=>void})=><button onClick={()=>onOpenApp('#/sample')}>Sample 열기</button>}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();auth.user=null;auth.authError=null;auth.isAuthLoading=false;auth.isAuthMutating=false;history.replaceState(null,'','/')})
function go(hash:string){act(()=>{window.location.hash=hash;window.dispatchEvent(new HashChangeEvent('hashchange'))})}
describe('AI City main entry',()=>{
 it('opens the public city immediately while authentication is loading or missing',()=>{
  auth.isAuthLoading=true;auth.authError='Firebase configuration is missing: example'
  render(<AppShell/>)
  expect(screen.getByRole('main',{name:'AI City 메인'})).toBeTruthy()
  expect(screen.getByText('공개 도시')).toBeTruthy()
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.queryByRole('region',{name:'로그인'})).toBeNull()
  expect(screen.getByRole('link',{name:'로그인'}).getAttribute('href')).toBe('#/login')
  expect(screen.getByRole('link',{name:'MOA 앱 ↗'}).getAttribute('href')).toBe('#/apps')
  expect(auth.signInWithGoogle).not.toHaveBeenCalled()
 })
 it('keeps the city as the main app for signed-in users and the legacy root hash',()=>{
  auth.user={uid:'u1',email:'person@example.com'} as User
  history.replaceState(null,'','/#/')
  render(<AppShell/>)
  expect(screen.getByText('공개 도시')).toBeTruthy()
  expect(screen.getByRole('link',{name:'계정'})).toBeTruthy()
  expect(screen.queryByRole('heading',{name:'Apps'})).toBeNull()
 })
 it('opens login only after navigation and returns to the city without signing in',()=>{
  render(<AppShell/>);go('#/login')
  expect(screen.getByRole('tab',{name:'Google 로그인'})).toBeTruthy()
  expect(screen.queryByText('공개 도시')).toBeNull()
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
