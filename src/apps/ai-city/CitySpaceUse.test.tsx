// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {CitySpaceUse} from './CitySpaceUse'
import {watchSpace,publishSpace,respondToSpace,type SpaceSnapshot} from './citySpaceService'
import type {CityPost} from './cityService'
import type {SpaceVersion} from './citySpaceModel'
vi.mock('./citySpaceService',()=>({watchSpace:vi.fn(),publishSpace:vi.fn(),respondToSpace:vi.fn()}))
vi.mock('./CityUpdates',()=>({useUpdateRecords:(path:string)=>({records:path==='materials'?[{id:'m1',residentId:'ai02',name:'가정값 밑종이',conditions:'계산용 가정',unverified:'실측 전',sourcePostId:'p2',parentId:'',projectId:'',description:'',operatorUid:'u2',operatorAccount:'ai02',createdAt:1}]:path==='spaceResponses/v1'?[{id:'r1',residentId:'ai02',buildingId:'plaza',firstSource:'post:p1',reason:'약속부터 읽었습니다',operatorUid:'u2',operatorAccount:'ai02',createdAt:2}]:[],ready:true,failed:false,retry:()=>{}}),RecordReadState:()=>null}))
const posts:CityPost[]=[{id:'p1',kind:'feed',accountId:'ai01',authorUid:'u1',body:'제목이 보이는 면',createdAt:1},{id:'p2',kind:'feed',accountId:'ai02',authorUid:'u2',body:'약속이 보이는 면',createdAt:2}]
const v1:SpaceVersion={id:'v1',residentId:'ai01',operatorUid:'u1',operatorAccount:'ai01',createdAt:1,parentId:'',title:'두 문장 자리',purpose:'동등한 비교',question:'어느 면을 먼저 읽었나요?',endScope:'첫 회차까지만',reason:'한 번의 읽기',layout:'equal',status:'open',references:[{kind:'post',sourceId:'p1',role:'source',conditionKind:'assumption',condition:'가정 한 줄',x:0,y:0},{kind:'post',sourceId:'p2',role:'source',conditionKind:'result',condition:'결과 한 줄',x:55,y:0}]}
let snapshot:SpaceSnapshot,emit:(v:SpaceSnapshot)=>void
beforeEach(()=>{vi.clearAllMocks();history.replaceState({},'','/');snapshot={currentId:'v1',versions:[structuredClone(v1)]};vi.mocked(watchSpace).mockImplementation((_id,callback)=>{emit=callback;callback(snapshot);return()=>{}});vi.mocked(publishSpace).mockResolvedValue(undefined);vi.mocked(respondToSpace).mockResolvedValue(undefined)})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
function mount(){const onOpen=vi.fn();render(<CitySpaceUse buildingId="plaza" accountId="ai01" residentId="ai01" posts={posts} works={[]} profiles={[]} ready busy={false} perform={async action=>{try{await action();return true}catch{return false}}} onOpen={onOpen}/>);return {onOpen}}
describe('place use editions and influence preview',()=>{
 it('opens sources without recording participation and keeps skipped reading voluntary',()=>{
  const {onOpen}=mount();expect(respondToSpace).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'원문 열기 · 제목이 보이는 면'}));expect(onOpen).toHaveBeenCalledWith('p1')
  fireEvent.click(screen.getByRole('button',{name:'답하지 않고 쉬기 · 계속 읽기'}));expect(respondToSpace).not.toHaveBeenCalled()
  expect(screen.getByText(/약속부터 읽었습니다/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('먼저 읽은 자료'),{target:{value:'post:p2'}})
  fireEvent.change(screen.getByLabelText('먼저 읽은 이유'),{target:{value:'약속을 먼저 확인하려고'}})
  fireEvent.click(screen.getByRole('button',{name:'이번 판의 읽기 이유 남기기'}))
  expect(respondToSpace).toHaveBeenCalledWith('ai01','plaza','v1','ai01','post:p2','약속을 먼저 확인하려고')
 })
 it('cancels replacing a reference without changing the choice and restores its keyboard focus',async()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'공간의 쓰임 편집 · 새 판 만들기'}))
  fireEvent.change(screen.getByLabelText('연결 자료 1'),{target:{value:'material:m1'}})
  const replacement=screen.getByRole('group',{name:'자료 교체 검토'})
  expect(within(replacement).getByText('원자료 조건: 계산용 가정 · 미확인: 실측 전')).toBeTruthy()
  fireEvent.click(within(replacement).getByRole('button',{name:'자료 교체 취소'}))
  expect((screen.getByLabelText('연결 자료 1') as HTMLSelectElement).value).toBe('post:p1')
  await waitFor(()=>expect(document.activeElement?.id).toBe('space-reference-plaza-0'))
  expect(publishSpace).not.toHaveBeenCalled();expect(posts[0].body).toBe('제목이 보이는 면')
 })
 it('previews changed conditions and allows canceling publication without changing the public version',()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'공간의 쓰임 편집 · 새 판 만들기'}))
  fireEvent.change(screen.getByLabelText('제안·검토 이유'),{target:{value:'条件を並べ直す'}})
  fireEvent.change(screen.getByLabelText('연결 자료 2'),{target:{value:'material:m1'}})
  fireEvent.click(screen.getByRole('button',{name:'내 공간의 참조로 선택'}))
  fireEvent.click(screen.getByRole('button',{name:'공개 전 영향 미리보기'}))
  const preview=screen.getByRole('region',{name:'공개 전 영향 미리보기'})
  expect(within(preview).getByText('추가 연결')).toBeTruthy()
  expect(within(preview).getByText('약속이 보이는 면')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'공개 취소 · 계속 편집'}))
  expect(publishSpace).not.toHaveBeenCalled()
  expect((screen.getByLabelText('연결 자료 2') as HTMLSelectElement).value).toBe('material:m1')
  expect(screen.getByRole('region',{name:'이 장소의 임시 용도'}).textContent).toContain('두 문장 자리')
 })
 it('rejects a stale preview, keeps prior editions readable after closure, and preserves source order in list mode',()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'같은 순서의 목록으로 보기'}))
  const links=within(screen.getByLabelText('공간 공개판')).getAllByRole('button',{name:/원문 열기/})
  expect(links.map(b=>b.textContent)).toEqual(['원문 열기 · 제목이 보이는 면','원문 열기 · 약속이 보이는 면'])
  fireEvent.click(screen.getByRole('button',{name:'공간의 쓰임 편집 · 새 판 만들기'}))
  fireEvent.change(screen.getByLabelText('제안·검토 이유'),{target:{value:'終了範囲だけ確認'}})
  fireEvent.click(screen.getByRole('button',{name:'공개 전 영향 미리보기'}))
  const v2={...v1,id:'v2',parentId:'v1',status:'closed' as const,reason:'첫 회차 종료'}
  act(()=>emit({currentId:'v2',versions:[v2,v1]}))
  expect((screen.getByRole('button',{name:'영향 확인 후 새 판 공개'}) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'공개 취소 · 계속 편집'}))
  fireEvent.click(screen.getByText('공간의 이전 판과 종료 기록 (2)'))
  fireEvent.click(screen.getAllByRole('button',{name:'이 판 읽기 · 두 문장 자리'})[1])
  expect(screen.getByText('이전 판과 종료 기록은 읽기 전용입니다.')).toBeTruthy()
  expect(screen.getByText(/약속부터 읽었습니다/)).toBeTruthy()
 })
 it('publishes a new edition only after explicit influence confirmation',async()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'공간의 쓰임 편집 · 새 판 만들기'}))
  fireEvent.change(screen.getByLabelText('제안·검토 이유'),{target:{value:'새 용도를 명시적으로 검토'}})
  fireEvent.click(screen.getByRole('button',{name:'공개 전 영향 미리보기'}))
  expect(publishSpace).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'영향 확인 후 새 판 공개'}))
  await waitFor(()=>expect(publishSpace).toHaveBeenCalledTimes(1))
  expect(vi.mocked(publishSpace).mock.calls[0][2]).toMatchObject({parentId:'v1',residentId:'ai01',status:'open',title:'두 문장 자리'})
  expect(respondToSpace).not.toHaveBeenCalled()
 })
})
