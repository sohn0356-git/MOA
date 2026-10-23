// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {CityWorldProvider,CityAvatarEditor} from './CityAvatar'
import {CityWorld} from './CityWorld'
import {defaultCityProfiles} from './cityResidents'
import {defaultAvatar,worldPlaces,worldNodes,walkingRoute,routeLength,routePosition,residentWorldState,nearestWorldNode,type CityWorldCommand} from './cityWorld'
import {saveWorldAvatar,saveWorldDestination,watchWorldAvatars,watchWorldCommands} from './cityWorldService'
vi.mock('./cityWorldService',()=>({watchWorldAvatars:vi.fn((cb:(v:object)=>void)=>{cb({});return()=>{}}),watchWorldCommands:vi.fn((cb:(v:object)=>void)=>{cb({});return()=>{}}),saveWorldAvatar:vi.fn().mockResolvedValue(undefined),saveWorldDestination:vi.fn().mockResolvedValue(undefined)}))
afterEach(()=>{cleanup();vi.restoreAllMocks()})
beforeEach(()=>{vi.clearAllMocks()})
const perform=vi.fn(async (action:()=>Promise<void>)=>{await action();return true})
const profiles=defaultCityProfiles.slice(0,2)
function renderWorld(){const onProfile=vi.fn(),onPost=vi.fn();const result=render(<CityWorldProvider><CityWorld profiles={profiles} posts={[{id:'p1',kind:'feed',accountId:'ai02',authorUid:'u2',createdAt:1,body:'모아의 기록'}]} residentId="ai01" accountId="ai01" busy={false} perform={perform} onProfile={onProfile} onPost={onPost}/></CityWorldProvider>);return {...result,onProfile,onPost}}
describe('virtual city movement',()=>{
 it('connects every destination through walkable graph edges',()=>{
  for(const from of worldPlaces)for(const to of worldPlaces){const route=walkingRoute(from.id,to.id);expect(route[0]).toEqual(worldNodes[from.id]);expect(route.at(-1)).toEqual(worldNodes[to.id]);for(let i=1;i<route.length;i++)expect(route[i].x===route[i-1].x||route[i].y===route[i-1].y).toBe(true)}
 })
 it('keeps automatic residents reproducible, distributed and continuous at cycle boundaries',()=>{
  const now=1792700000000
  const states=defaultCityProfiles.map(p=>residentWorldState(p.id,now))
  expect(new Set(states.map(s=>s.point.x+','+s.point.y)).size).toBeGreaterThan(4)
  expect(residentWorldState('ai01',now)).toEqual(residentWorldState('ai01',now))
  for(let t=now;t<now+180000;t+=500){const a=residentWorldState('ai01',t).point,b=residentWorldState('ai01',t+1).point;expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeLessThan(1)}
 })
 it('interpolates saved movement from its actual position without teleporting and stays at arrival',()=>{
  const command:CityWorldCommand={from:'west',startX:290,startY:300,to:'library',mode:'walk',duration:60000,startedAt:1000,operatorUid:'u1',operatorAccount:'ai01'}
  expect(residentWorldState('ai01',1000,command).point).toEqual({x:290,y:300})
  expect(residentWorldState('ai01',31000,command).moving).toBe(true)
  expect(residentWorldState('ai01',61000,command).point).toEqual(worldNodes.library)
  expect(residentWorldState('ai01',90000,command).moving).toBe(false)
  expect(residentWorldState('ai01',61000,{...command,mode:'stay'}).point).toEqual({x:290,y:300})
  expect(nearestWorldNode({x:290,y:320})).toBe('west')
  expect(routePosition(walkingRoute('cafe','plaza'),-1)).toEqual(worldNodes.cafe)
  expect(routeLength(walkingRoute('cafe','plaza'))).toBe(410)
 })
 it('gives each resident a stable individual look',()=>{
  expect(defaultAvatar('resident-17')).toEqual(defaultAvatar('resident-17'))
  expect(defaultAvatar('ai01')).not.toEqual(defaultAvatar('ai02'))
 })
})
describe('world observation and editing',()=>{
 it('lets a viewer observe another resident, follow, pause, open their profile and original post',()=>{
  const {onProfile,onPost}=renderWorld()
  fireEvent.click(screen.getByRole('button',{name:'모아 관찰하기'}))
  const panel=screen.getByRole('complementary',{name:'캐릭터 관찰 패널'})
  expect(within(panel).getByRole('heading',{name:'모아'})).toBeTruthy()
  fireEvent.click(within(panel).getByRole('button',{name:'이 주민 따라가기'}))
  expect(screen.getByText('모아 따라가는 중')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'관찰 일시정지'}))
  expect(screen.getByRole('button',{name:'관찰 재생'})).toBeTruthy()
  fireEvent.click(within(panel).getByRole('button',{name:'프로필 · 작업실 보기'}));expect(onProfile).toHaveBeenCalledWith('ai02')
  fireEvent.click(within(panel).getByRole('button',{name:'모아의 기록 ↗'}));expect(onPost).toHaveBeenCalledWith('p1')
 })
 it('saves the active resident destination without changing an observed neighbor',async()=>{
  renderWorld()
  fireEvent.click(screen.getByRole('button',{name:'모아 관찰하기'}))
  fireEvent.click(screen.getByRole('button',{name:'이야기 도서관 장소 선택'}))
  fireEvent.click(screen.getByRole('button',{name:'이곳으로 산책'}))
  await waitFor(()=>expect(saveWorldDestination).toHaveBeenCalledWith('ai01','ai01',expect.objectContaining({x:expect.any(Number),y:expect.any(Number)}),'library','walk'))
 })
 it('supports keyboard map panning, zoom, reset and resident search',()=>{
  renderWorld()
  const map=screen.getByRole('group',{name:'AI City 가상 도시 지도'}),before=map.getAttribute('viewBox')
  fireEvent.keyDown(map,{key:'ArrowLeft'});expect(map.getAttribute('viewBox')).not.toBe(before)
  fireEvent.click(screen.getByRole('button',{name:'지도 확대'}));expect(screen.getByText('125%')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'전체 도시'}));expect(map.getAttribute('viewBox')).toBe(before)
  fireEvent.change(screen.getByLabelText('도시의 주민 찾기'),{target:{value:'모아'}})
  const list=screen.getByLabelText('도시의 주민 찾기').parentElement!.nextElementSibling!
  expect(within(list as HTMLElement).getAllByRole('button')).toHaveLength(1)
 })
 it('previews avatar edits, cancels without saving, and saves only the resident appearance',async()=>{
  render(<CityWorldProvider><CityAvatarEditor residentId="ai01" accountId="ai01" name="하람" busy={false} perform={perform}/></CityWorldProvider>)
  fireEvent.click(screen.getByRole('button',{name:'아바타 만들기 · 수정'}))
  fireEvent.click(screen.getByRole('button',{name:'피부색 3'}));fireEvent.click(screen.getByRole('button',{name:'취소'}));expect(saveWorldAvatar).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'아바타 만들기 · 수정'}))
  fireEvent.click(screen.getByRole('button',{name:'의상 색 2'}))
  fireEvent.change(screen.getByLabelText('헤어스타일'),{target:{value:'curly'}})
  fireEvent.click(screen.getByRole('button',{name:'아바타 저장'}))
  await waitFor(()=>expect(saveWorldAvatar).toHaveBeenCalledWith('ai01','ai01',expect.objectContaining({shirt:1,style:'curly'})))
  expect(Object.keys(vi.mocked(saveWorldAvatar).mock.calls[0][2]).sort()).toEqual(['accessory','hair','shirt','skin','style'])
 })
 it('keeps the editor draft when saving fails',async()=>{
  const failedPerform=vi.fn(async()=>false)
  render(<CityWorldProvider><CityAvatarEditor residentId="ai01" accountId="ai01" name="하람" busy={false} perform={failedPerform}/></CityWorldProvider>)
  fireEvent.click(screen.getByRole('button',{name:'아바타 만들기 · 수정'}));fireEvent.click(screen.getByRole('button',{name:'피부색 5'}));fireEvent.click(screen.getByRole('button',{name:'아바타 저장'}))
  await waitFor(()=>expect(failedPerform).toHaveBeenCalled())
  expect(screen.getByRole('button',{name:'피부색 5'}).getAttribute('aria-pressed')).toBe('true')
 })
 it('blocks remote changes on read failure while keeping the map observable',()=>{
  vi.mocked(watchWorldCommands).mockImplementationOnce((_callback,onError)=>{onError();return()=>{}})
  renderWorld();expect(screen.getByRole('button',{name:'이곳으로 산책'}).hasAttribute('disabled')).toBe(true);expect(screen.getByRole('button',{name:'모아 관찰하기'})).toBeTruthy()
 })
 it('unsubscribes both shared observers on unmount',()=>{
  const a=vi.fn(),b=vi.fn()
  vi.mocked(watchWorldAvatars).mockImplementationOnce(callback=>{callback({});return a})
  vi.mocked(watchWorldCommands).mockImplementationOnce(callback=>{callback({});return b})
  const {unmount}=renderWorld();unmount();expect(a).toHaveBeenCalledOnce();expect(b).toHaveBeenCalledOnce()
 })
})
