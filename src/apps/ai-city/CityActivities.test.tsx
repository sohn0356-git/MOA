// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {CityContinuations} from './CityContinuations'
import {CityLab} from './CityLab'
import {CityNews} from './CityNews'
import {defaultCityProfiles} from './cityResidents'
import {subscribeCityContinuations,saveCityContinuation,publishCityContinuation,subscribeCityLabs,saveCityLabEvent,type CityPost,type CityContinuation,type CityLabEvent} from './cityService'
vi.mock('./cityService',()=>({subscribeCityContinuations:vi.fn(),saveCityContinuation:vi.fn(),publishCityContinuation:vi.fn(),subscribeCityLabs:vi.fn(),saveCityLabEvent:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();vi.mocked(saveCityContinuation).mockResolvedValue(undefined);vi.mocked(publishCityContinuation).mockResolvedValue(undefined);vi.mocked(saveCityLabEvent).mockResolvedValue(undefined)})
const perform=async(action:()=>Promise<void>)=>{await action();return true}
const posts:CityPost[]=[
{id:'parent',kind:'feed',body:'의자 이야기 원문',accountId:'ai09',authorUid:'u9',createdAt:1,comments:{c:{accountId:'ai01',authorUid:'u1',body:'부모 댓글',createdAt:2}}},
{id:'a',kind:'feed',body:'수건을 치우는 결말',accountId:'ai01',authorUid:'u1',createdAt:3},
{id:'b',kind:'feed',body:'편지를 받는 결말',accountId:'ai02',authorUid:'u2',createdAt:4},
{id:'existing',kind:'feed',body:'이미 작성한 다른 후속',accountId:'ai01',authorUid:'u1',createdAt:5}
]
it('reads sibling continuations and returns to parent comments without changing original authors or text',()=>{
  const links:CityContinuation[]=[{id:'a',parentPostId:'parent',label:'수건',residentId:'ai01',operatorUid:'u1',operatorAccount:'ai01',createdAt:5},{id:'b',parentPostId:'parent',label:'편지',residentId:'ai02',operatorUid:'u2',operatorAccount:'ai02',createdAt:6}]
  vi.mocked(subscribeCityContinuations).mockImplementation(callback=>{callback(links);return()=>{}})
  const onOpen=vi.fn()
  render(<CityContinuations sourceId="parent" posts={posts} profiles={defaultCityProfiles} accountId="ai01" residentId="ai01" busy={false} perform={perform} onOpen={onOpen}/>)
  fireEvent.click(screen.getByRole('button',{name:/^수건 ·/}))
  expect(screen.getByText('수건을 치우는 결말')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'부모 원문·댓글 보기'}))
  expect(onOpen).toHaveBeenCalledWith('parent')
  fireEvent.click(screen.getByRole('button',{name:/^편지 ·/}))
  expect(screen.getByText('편지를 받는 결말')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'후속 원문·댓글 보기'}))
  expect(onOpen).toHaveBeenLastCalledWith('b')
  expect(posts[0].body).toBe('의자 이야기 원문')
  expect(posts[0].comments!.c.body).toBe('부모 댓글')
  expect(posts[2].accountId).toBe('ai02')
})
it('publishes only explicitly written new continuations and can link an existing later original',async()=>{
  vi.mocked(subscribeCityContinuations).mockImplementation(callback=>{callback([]);return()=>{}})
  render(<CityContinuations sourceId="parent" posts={posts} profiles={defaultCityProfiles} accountId="ai01" residentId="ai01" busy={false} perform={perform} onOpen={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'여기서 이어 쓰기'}))
  expect(publishCityContinuation).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('갈림길 이름'),{target:{value:'첫 후속'}})
  fireEvent.change(screen.getByLabelText('새 후속 본문'),{target:{value:'직접 작성한 후속'}})
  fireEvent.click(screen.getByRole('button',{name:'후속 글 게시·연결'}))
  await waitFor(()=>expect(publishCityContinuation).toHaveBeenCalledWith('ai01','ai01','parent','첫 후속','직접 작성한 후속'))
  fireEvent.click(screen.getByRole('button',{name:'여기서 이어 쓰기'}))
  fireEvent.change(screen.getByLabelText('갈림길 이름'),{target:{value:'기존 후속'}})
  fireEvent.change(screen.getByLabelText('기존 후속 글 선택'),{target:{value:'existing'}})
  fireEvent.click(screen.getByRole('button',{name:'기존 글 연결'}))
  await waitFor(()=>expect(saveCityContinuation).toHaveBeenCalledWith('ai01','parent','existing','기존 후속'))
})
it('does not offer self, older, or already parented records as existing children',()=>{
  vi.mocked(subscribeCityContinuations).mockImplementation(callback=>{callback([{id:'existing',parentPostId:'parent',label:'이미 연결',residentId:'ai01',createdAt:6,operatorUid:'u1',operatorAccount:'ai01'}]);return()=>{}})
  render(<CityContinuations sourceId="a" posts={posts} profiles={defaultCityProfiles} accountId="ai01" residentId="ai01" busy={false} perform={perform} onOpen={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'여기서 이어 쓰기'}))
  expect(within(screen.getByLabelText('기존 후속 글 선택')).getAllByRole('option')).toHaveLength(1)
})
it('keeps lab criteria history, labels zero observations, and requires evidence for actual observation',async()=>{
  const old:CityLabEvent={id:'e1',question:'버튼 예상',optionA:'소리 켜기',optionB:'소리 허용하기',conditions:'같은 그림',criteria:'예상 동작',phase:'unperformed',origin:'none',evidence:'',observation:'',sourcePostId:'parent',residentId:'ai01',createdAt:1,operatorUid:'u1',operatorAccount:'ai01'}
  const labs:Record<string,CityLabEvent[]>={'lab-1':[old]}
  let notify:(value:Record<string,CityLabEvent[]>)=>void=()=>{}
  vi.mocked(subscribeCityLabs).mockImplementation((_id,callback)=>{notify=callback;callback(labs);return()=>{}})
  vi.mocked(saveCityLabEvent).mockImplementation(async(_a,residentId,_p,id,input)=>{labs[id]=[{...input,id:'e2',residentId,createdAt:2,operatorUid:'u1',operatorAccount:'ai01'},...labs[id]];notify({...labs})})
  const onOpen=vi.fn()
  render(<CityLab projectId="first-plaza" posts={[{...posts[0],projectId:'first-plaza'}]} profiles={defaultCityProfiles} residentId="ai01" accountId="ai01" busy={false} perform={perform} onOpen={onOpen}/>)
  expect(screen.getByText('관찰 0건 · 결과 없음')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'기준 수정·관찰 추가'}))
  fireEvent.change(screen.getByLabelText('판단 기준'),{target:{value:'바꾼 기준'}})
  fireEvent.change(screen.getByLabelText('관찰 출처'),{target:{value:'actual'}})
  expect((screen.getByRole('button',{name:'비교 기록 저장'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('관찰·회고 메모'),{target:{value:'문구를 읽은 가상 의견'}})
  fireEvent.change(screen.getByLabelText('관찰 출처'),{target:{value:'virtual'}})
  fireEvent.change(screen.getByLabelText('비교 단계'),{target:{value:'review'}})
  fireEvent.click(screen.getByRole('button',{name:'비교 기록 저장'}))
  await waitFor(()=>expect(saveCityLabEvent).toHaveBeenCalledWith('ai01','ai01','first-plaza','lab-1',expect.objectContaining({criteria:'바꾼 기준',origin:'virtual'})))
  expect(labs['lab-1'][1].criteria).toBe('예상 동작')
  expect(screen.getByText('실제 관찰 없음 · 어떤 안도 아직 검증되지 않음')).toBeTruthy()
  expect(screen.getByText(/고정 조건: 같은 그림 · 판단 기준: 예상 동작/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'비교 근거 원글·댓글'}))
  expect(onOpen).toHaveBeenCalledWith('parent')
})
it('creates a comparison plan as unperformed without an automatic winner',async()=>{
  vi.mocked(subscribeCityLabs).mockImplementation((_id,callback)=>{callback({});return()=>{}})
  render(<CityLab projectId="first-plaza" posts={[]} profiles={defaultCityProfiles} residentId="ai01" accountId="ai01" busy={false} perform={perform} onOpen={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'새 비교 준비'}))
  for(const name of ['비교 질문','비교안 A','비교안 B','고정 조건','판단 기준'])fireEvent.change(screen.getByLabelText(name),{target:{value:name+' 내용'}})
  fireEvent.click(screen.getByRole('button',{name:'비교 기록 저장'}))
  await waitFor(()=>expect(saveCityLabEvent).toHaveBeenCalledWith('ai01','ai01','first-plaza',expect.stringMatching(/^lab-/),expect.objectContaining({phase:'unperformed',origin:'none',observation:''})))
})
it('shows actual completion records and preserves each resident last-seen timestamp independently',()=>{
  const idea:CityPost={id:'idea',kind:'suggestion',body:'결과 글 연결 기능\n설명',accountId:'ai08',authorUid:'u8',createdAt:1,projectId:'first-plaza',implementation:{applied:true,reviewedAt:2,reviewerAccount:'ai01',reviewerUid:'u1',note:'수동 확인된 범위'}}
  const onOpen=vi.fn(),onProject=vi.fn()
  const props={posts:[idea,{...idea,id:'fake',kind:'feed' as const,body:'일반 글의 오래된 체크'}],projects:[],profiles:[],onOpen,onProject,onResidents:vi.fn()}
  const view=render(<CityNews {...props} residentId="ai01"/>)
  expect(screen.queryByText('일반 글의 오래된 체크')).toBeNull()
  const news=screen.getByRole('region',{name:'지난 방문 이후 도시 소식'})
  fireEvent.click(within(news).getAllByRole('button',{name:'관련 프로젝트 화면'})[0])
  expect(onProject).toHaveBeenCalledWith('first-plaza')
  fireEvent.click(within(news).getAllByRole('button',{name:'근거 건의 보기'})[0])
  expect(onOpen).toHaveBeenCalledWith('idea')
  fireEvent.click(screen.getByRole('button',{name:'소식 확인 시각 저장'}))
  const seen=JSON.parse(localStorage.getItem('moa:ai-city:notebook:news-seen')!)
  expect(seen.ai01).toBeGreaterThan(0)
  view.rerender(<CityNews {...props} residentId="ai02"/>)
  expect(screen.getByText(/마지막 확인: 아직 확인하지 않음/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'소식 확인 시각 저장'}))
  expect(JSON.parse(localStorage.getItem('moa:ai-city:notebook:news-seen')!).ai01).toBe(seen.ai01)
})
