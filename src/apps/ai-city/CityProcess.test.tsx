// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {CityStageMap,CityDependencies,CityWorkshops} from './CityProjectProcess'
import {CityReviewResponses} from './CityReviewResponses'
import {CityScreening} from './CityScreening'
import {CityRecordLab,CityQuoteCard} from './CityRecordLab'
import {CityEvidenceLink} from './CityEvidenceLink'
import {CitySavedViews,defaultCityView,type CityViewConfig} from './CitySavedViews'
import {CityBatch} from './CityBatch'
import {CityTriage} from './CityTriage'
import {CityUiSamples,CityPractice} from './CityUi'
import {useState} from 'react'
import {watchCityRecords,watchCityValue} from './cityCollaboration'
import {runCityBatch,dependencyCycle,saveStageMap,saveDependencies,answerReview,addWorkshopEvent,joinWorkshop,batchSteps,saveTriage,type StageMap,type Workshop,type ReviewAnswer} from './cityProcessService'
import {cityRecords,literalDifference,readCityEvidence,readCurrentCityRecord,connectCityRecords,type RecordQuote} from './cityReferenceService'
import {subscribeCityVisualNotes,subscribeCityStudio,subscribeCityLabs,type CityPost} from './cityService'
import {defaultCityProfiles} from './cityResidents'
vi.mock('./cityCollaboration',()=>({watchCityRecords:vi.fn(),watchCityValue:vi.fn()}))
vi.mock('./cityService',()=>({subscribeCityVisualNotes:vi.fn(),subscribeCityStudio:vi.fn(),subscribeCityLabs:vi.fn()}))
vi.mock('./cityProcessService',async()=>({...await vi.importActual<typeof import('./cityProcessService')>('./cityProcessService'),saveStageMap:vi.fn(),saveDependencies:vi.fn(),createReviewQuestion:vi.fn(),answerReview:vi.fn(),createWorkshop:vi.fn(),joinWorkshop:vi.fn(),linkWorkshopDraft:vi.fn(),addWorkshopEvent:vi.fn(),batchSteps:vi.fn(),saveTriage:vi.fn()}))
vi.mock('./cityReferenceService',async()=>({...await vi.importActual<typeof import('./cityReferenceService')>('./cityReferenceService'),readCityEvidence:vi.fn(),readCurrentCityRecord:vi.fn(),connectCityRecords:vi.fn(),quoteCityRecord:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();vi.mocked(watchCityRecords).mockImplementation((_path,callback)=>{callback([]);return()=>{}});vi.mocked(watchCityValue).mockImplementation((_path,callback)=>{callback({} as never);return()=>{}});vi.mocked(subscribeCityLabs).mockImplementation((_id,callback)=>{callback({});return()=>{}});vi.mocked(subscribeCityVisualNotes).mockImplementation((_id,callback)=>{callback([]);return()=>{}});vi.mocked(subscribeCityStudio).mockImplementation((_id,callback)=>{callback([]);return()=>{}});vi.mocked(readCityEvidence).mockResolvedValue(null);vi.mocked(readCurrentCityRecord).mockResolvedValue(null)})
const meta={operatorUid:'u1',operatorAccount:'ai01',createdAt:1}
const posts:CityPost[]=[{id:'p1',kind:'feed',accountId:'ai01',authorUid:'u1',body:'첫 문장\n조건 A',projectId:'first-plaza',createdAt:1,comments:{c1:{accountId:'ai02',authorUid:'u2',body:'원댓글',createdAt:2}}},{id:'p2',kind:'feed',accountId:'ai02',authorUid:'u2',body:'첫 문장\n조건 B',projectId:'first-plaza',createdAt:3}]
const profiles=defaultCityProfiles
const perform=async(action:()=>Promise<void>)=>{try{await action();return true}catch{return false}}
const props={projectId:'first-plaza',residentId:'ai01',accountId:'ai01',posts,profiles,busy:false,perform,onOpen:vi.fn()}
it('retries only failed batch steps and never repeats a successful original link',async()=>{
 const first=vi.fn().mockResolvedValue(undefined),second=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
 const steps=[{id:'project',run:first},{id:'studio',run:second}]
 const partial=await runCityBatch(steps)
 expect(partial.map(result=>result.status)).toEqual(['done','failed'])
 const complete=await runCityBatch(steps,partial)
 expect(complete.every(result=>result.status==='done')).toBe(true)
 expect(first).toHaveBeenCalledTimes(1);expect(second).toHaveBeenCalledTimes(2)
})
it('warns for condition cycles and distinguishes independent nodes without assigning work',()=>{
 const nodes=[{id:'1',title:'A',postId:''},{id:'2',title:'B',postId:''},{id:'3',title:'독립',postId:''}]
 const edge={before:'1',after:'2',condition:'조건',reason:'미확인',postId:'p1',evidencePostId:''}
 expect(dependencyCycle({nodes,edges:[edge]})).toBe(false)
 expect(dependencyCycle({nodes,edges:[edge,{...edge,before:'2',after:'1'}]})).toBe(true)
})
it('preserves literal quotes and newlines when marking character difference candidates',()=>{
 const before='“문장”\n조건 A\n끝',after='“문장”\n조건 B\n끝',diff=literalDifference(before,after)
 expect(diff.prefix+diff.removed+diff.suffix).toBe(before)
 expect(diff.prefix+diff.added+diff.suffix).toBe(after)
 expect(diff.removed).toBe('A');expect(diff.added).toBe('B')
})
it('reorders stable review points while retaining original comment links and explicit pause reasons',async()=>{
 const base={condition:'오늘 자원 범위 확인',unknown:'범위 미확인',reason:'범위 전 보류',status:'paused' as const,postId:'p1',commentId:'c1',labId:''}
 const map:StageMap={...meta,id:'v1',residentId:'ai01',points:[{...base,id:'one',title:'준비'},{...base,id:'two',title:'후속'}]}
 vi.mocked(watchCityRecords).mockImplementation((_path,callback)=>{callback([map] as never);return()=>{}})
 render(<CityStageMap {...props}/>)
 fireEvent.click(screen.getByRole('button',{name:'단계 지도 편집'}))
 fireEvent.click(screen.getAllByRole('button',{name:'지점 아래로'})[0])
 fireEvent.click(screen.getByRole('button',{name:'단계 지도 저장'}))
 await waitFor(()=>expect(saveStageMap).toHaveBeenCalledWith('ai01','first-plaza','ai01',[expect.objectContaining({id:'two',commentId:'c1'}),expect.objectContaining({id:'one',status:'paused'})]))
 expect(map.points[0].id).toBe('one');expect(posts[0].comments!.c1.body).toBe('원댓글')
})
it('disables saving a cyclic condition board and does not create automatic completion',()=>{
 render(<CityDependencies {...props}/>)
 fireEvent.click(screen.getByRole('button',{name:'조건 보드 편집'}))
 fireEvent.click(screen.getByRole('button',{name:'조건 연결 추가'}))
 fireEvent.change(screen.getAllByLabelText('선행 작업')[1],{target:{value:'2'}})
 fireEvent.change(screen.getAllByLabelText('후행 작업')[1],{target:{value:'1'}})
 expect(screen.getByRole('alert').textContent).toContain('순환 연결')
 expect((screen.getByRole('button',{name:'조건 보드 저장'}) as HTMLButtonElement).disabled).toBe(true)
 expect(saveDependencies).not.toHaveBeenCalled()
})
it('shows one latest response per resident while preserving prior reasons and allowing cancel',async()=>{
 const q={...meta,residentId:'ai01',question:'안내 뜻이 이해되나요?',sourcePostId:'p1'}
 const answers:Record<string,Record<string,ReviewAnswer>>={ai01:{old:{...meta,id:'old',residentId:'ai01',choice:'understood',reason:'처음 이해'},latest:{...meta,id:'latest',createdAt:3,residentId:'ai01',choice:'paused',reason:'조건 확인 후 판단'}}}
 vi.mocked(watchCityValue).mockImplementation((path,callback)=>{callback((path.startsWith('reviewQuestions')?q:answers) as never);return()=>{}})
 render(<CityReviewResponses {...props} reviewId="r1" ownerResidentId="ai01" ownerAccountId="ai01" sourcePostId="p1"/>)
 expect(screen.getAllByText(/현재 선택: 지금 판단 보류/)).toHaveLength(1)
 expect(screen.getByText(/처음 이해/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'내 검토 응답'}))
 fireEvent.change(screen.getByLabelText('내 검토 선택'),{target:{value:'question'}})
 fireEvent.change(screen.getByLabelText('내 검토 이유'),{target:{value:'범위를 더 알고 싶음'}})
 fireEvent.click(screen.getByRole('button',{name:'응답 작성 취소'}))
 expect(answerReview).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'내 검토 응답'}))
 fireEvent.click(screen.getByRole('button',{name:'검토 응답 저장'}))
 await waitFor(()=>expect(answerReview).toHaveBeenCalledWith('ai01','first-plaza','r1','ai01','question','범위를 더 알고 싶음'))
})
it('requires explicit workshop joining and records cross review against another registered draft',async()=>{
 const session:Workshop={...meta,id:'s1',residentId:'ai01',title:'천 공방',question:'무엇을 살펴볼까'}
 vi.mocked(watchCityRecords).mockImplementation((path,callback)=>{callback((path.startsWith('workshops/')?[session]:[]) as never);return()=>{}})
 let notify:(value:unknown)=>void=()=>{}
 vi.mocked(watchCityValue).mockImplementation((path,callback)=>{if(path.startsWith('workshopMembers')){notify=callback as (value:unknown)=>void;callback({} as never)}else callback({ai01:{postId:'p1'},ai02:{postId:'p2'}} as never);return()=>{}})
 render(<CityWorkshops {...props}/>)
 expect(screen.queryByRole('form',{name:'교차 검토 기록'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'이 주민으로 합류'}))
 await waitFor(()=>expect(joinWorkshop).toHaveBeenCalledWith('ai01','first-plaza','s1','ai01'))
 act(()=>notify({ai01:{residentId:'ai01'}}))
 fireEvent.change(screen.getByLabelText('다른 주민 초안'),{target:{value:'ai02'}})
 fireEvent.change(screen.getByLabelText('교차 검토 이유'),{target:{value:'조건 B의 이유를 읽고 질문'}})
 fireEvent.click(screen.getByRole('button',{name:'교차 검토 저장'}))
 await waitFor(()=>expect(addWorkshopEvent).toHaveBeenCalledWith('ai01','first-plaza','s1',expect.objectContaining({kind:'review',postId:'p2',targetResidentId:'ai02',decision:'none'})))
 expect(posts[1].body).toBe('첫 문장\n조건 B')
})
it('opens a readonly screening, toggles source notes and supports explicit scene movement and Escape',()=>{
 const close=vi.fn(),index=vi.fn(),open=vi.fn()
 render(<CityScreening works={[{id:'w1',sourcePostId:'p1',title:'장면 하나',type:'text',status:'draft',order:1,ownerUid:'u1',createdAt:1,updatedAt:1},{id:'w2',sourcePostId:'p2',title:'다른 판',type:'design-note',status:'draft',order:2,ownerUid:'u2',createdAt:1,updatedAt:1}]} posts={posts} profiles={profiles} index={0} onIndex={index} onClose={close} onOpen={open}/>)
 expect(document.querySelector('.city-screening-text')?.textContent).toBe(posts[0].body)
 expect(screen.queryByRole('textbox')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'근거 메모 열기'}))
 expect(screen.getByRole('region',{name:'상영 근거 메모'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'뒤 장면'}));expect(index).toHaveBeenCalledWith(1)
 fireEvent.keyDown(screen.getByRole('dialog',{name:'작품 상영 모드'}),{key:'Escape'});expect(close).toHaveBeenCalled()
 expect(open).not.toHaveBeenCalled()
})
it('connects exact record IDs and reads the same relation from both sides without duplicating originals',async()=>{
 const left={postId:'p1',commentId:''},right={postId:'p2',commentId:''}
 vi.mocked(watchCityRecords).mockImplementation((path,callback)=>{callback((path==='recordConnections'?[{...meta,id:'link',residentId:'ai01',left,right,relation:'objection',reason:'다른 조건'}]:[]) as never);return()=>{}})
 render(<CityRecordLab {...props} projects={[]} works={[]}/>)
 fireEvent.change(screen.getByLabelText('찾거나 인용할 기록'),{target:{value:JSON.stringify(['p1',''])}})
 fireEvent.change(screen.getByLabelText('연결할 다른 기록'),{target:{value:JSON.stringify(['p2',''])}})
 fireEvent.change(screen.getByLabelText('공개 연결 이유'),{target:{value:'조건을 비교'}})
 fireEvent.click(screen.getByRole('button',{name:'기록 두 건 연결'}))
 await waitFor(()=>expect(connectCityRecords).toHaveBeenCalledWith('ai01','ai01',expect.objectContaining(left),expect.objectContaining(right),'reference','조건을 비교'))
 fireEvent.click(screen.getByRole('button',{name:'오른쪽에서 연결 보기'}))
 expect(screen.getByText(/반론 · 다른 조건/)).toBeTruthy()
 expect(posts).toHaveLength(2)
})
it('keeps fixed quotations unchanged while latest quotations follow the newly confirmed version',async()=>{
 const record=cityRecords(posts)[0],quote:RecordQuote={...meta,id:'q',residentId:'ai01',postId:'p1',commentId:'',mode:'fixed',snapshotBody:'당시 문장',sourceResidentId:'ai01',sourceCreatedAt:1,revisionId:'',versionAt:1,reason:'읽기 맥락'}
 vi.mocked(readCurrentCityRecord).mockResolvedValue({...record,body:'새 문장',revisionId:'v2',versionAt:4})
 const ui=render(<CityQuoteCard quote={quote} profiles={profiles} onOpen={vi.fn()}/>)
 await waitFor(()=>expect(screen.getByRole('button',{name:'새 판 있음 · 원문에서 확인'})).toBeTruthy())
 expect(screen.getByText('당시 문장')).toBeTruthy()
 expect(screen.queryByText('새 문장')).toBeNull()
 ui.rerender(<CityQuoteCard quote={{...quote,id:'latest',mode:'latest'}} profiles={profiles} onOpen={vi.fn()}/>)
 await waitFor(()=>expect(screen.getByText('새 문장')).toBeTruthy())
 expect(screen.queryByText('당시 문장')).toBeNull()
})
it('distinguishes pending evidence, failed reads and recovery while retaining original metadata and ID',async()=>{
 const record=cityRecords(posts)[0];let resolve:(value:typeof record|null)=>void=()=>{}
 vi.mocked(readCityEvidence).mockImplementationOnce(()=>new Promise(value=>{resolve=value})).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(record)
 const open=vi.fn()
 render(<CityEvidenceLink postId="p1" posts={posts} profiles={profiles} residentId="ai01" reason="남은 조건" onOpen={open}/>)
 expect(screen.getByText(/근거: p1 · 확인 중/)).toBeTruthy()
 expect((screen.getByRole('button',{name:'점검한 근거 원문 열기'}) as HTMLButtonElement).disabled).toBe(true)
 await act(async()=>resolve(record))
 expect(screen.getByText(/열기 가능/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'같은 근거 다시 확인'}))
 await waitFor(()=>expect(screen.getByText(/읽기 요청 실패입니다/)).toBeTruthy())
 expect(screen.getByText(/보관한 제목: 첫 문장/)).toBeTruthy()
 expect(document.activeElement).toBe(screen.getByRole('button',{name:'같은 근거 다시 확인'}))
 fireEvent.click(screen.getByRole('button',{name:'같은 근거 다시 확인'}))
 await waitFor(()=>expect(screen.getByText(/열기 가능/)).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'점검한 근거 원문 열기'}));expect(open).toHaveBeenCalledWith('p1',undefined)
 expect(readCityEvidence).toHaveBeenLastCalledWith('p1','')
})
function ViewHarness({residentId}:{residentId:string}){const [value,setValue]=useState<CityViewConfig>({...defaultCityView,project:'first-plaza'});return <CitySavedViews residentId={residentId} kind="feed" value={value} onChange={setValue}/>}
it('stores three named view slots per resident and restores own settings without changing records',()=>{
 const ui=render(<ViewHarness residentId="ai01"/>)
 fireEvent.change(screen.getByLabelText('보기 작성자 조건'),{target:{value:'하람'}})
 fireEvent.change(screen.getByLabelText('보기 기록 범위'),{target:{value:'design'}})
 fireEvent.change(screen.getByLabelText('보기 이름'),{target:{value:'설계 읽기'}})
 fireEvent.click(screen.getByRole('button',{name:'현재 구성 저장·이름 변경'}))
 expect(screen.getByText('설계 읽기')).toBeTruthy()
 expect(within(screen.getByLabelText('내 보기 자리')).getAllByRole('option')).toHaveLength(3)
 ui.rerender(<ViewHarness residentId="ai02"/>)
 expect((screen.getByLabelText('보기 기록 범위') as HTMLSelectElement).value).toBe('all')
 expect(screen.queryByRole('button',{name:'설계 읽기 다시 열기'})).toBeNull()
 ui.rerender(<ViewHarness residentId="ai01"/>)
 expect((screen.getByLabelText('보기 기록 범위') as HTMLSelectElement).value).toBe('design')
 expect((screen.getByLabelText('보기 작성자 조건') as HTMLInputElement).value).toBe('하람')
})
it('cancels a reviewed batch without writes and exposes partial success before failed-only retry',async()=>{
 const first=vi.fn().mockResolvedValue(undefined),second=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
 vi.mocked(batchSteps).mockReturnValue([{id:'project',run:first},{id:'studio',run:second}])
 render(<CityBatch {...props} projects={[{id:'first-plaza',name:'첫 광장',description:'',stage:'idea',participantIds:{}}]}/>)
 fireEvent.change(screen.getByLabelText('묶음에 쓸 내 글'),{target:{value:'p1'}})
 fireEvent.change(screen.getByLabelText('연결할 프로젝트'),{target:{value:'first-plaza'}})
 fireEvent.change(screen.getByLabelText('빈 자리의 작업명 (기존 작업은 이름 유지)'),{target:{value:'내 작업'}})
 fireEvent.change(screen.getByLabelText('갱신할 다음 행동'),{target:{value:'조건 확인'}})
 fireEvent.click(screen.getByRole('button',{name:'실행 전 변경 목록 확인'}))
 fireEvent.click(screen.getByRole('button',{name:'전부 취소'}))
 expect(first).not.toHaveBeenCalled();expect(second).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'실행 전 변경 목록 확인'}))
 fireEvent.click(screen.getByRole('button',{name:'확인한 두 단계 실행'}))
 await waitFor(()=>expect(screen.getByText('본인 다음 행동: 실패 · offline')).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'실패 단계만 재시도'}))
 await waitFor(()=>expect(screen.getByText(/두 단계가 각각 성공/)).toBeTruthy())
 expect(first).toHaveBeenCalledTimes(1);expect(second).toHaveBeenCalledTimes(2)
})
it('keeps triage separate from implementation status and retains candidate filter on reopening',async()=>{
 const suggestions=[{...posts[0],kind:'suggestion' as const,body:'바꾸고 싶은 내용',implementation:{applied:false,reviewedAt:1,reviewerAccount:'codex',reviewerUid:'c',note:'미반영'}}]
 render(<CityTriage posts={suggestions} residentId="ai01" accountId="ai01" busy={false} ready perform={perform} onOpen={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'건의 검토함 열기'}))
 fireEvent.click(screen.getByRole('button',{name:'이 건의 검토 기록'}))
 fireEvent.change(screen.getByLabelText('건의 검토 상태'),{target:{value:'paused'}})
 fireEvent.change(screen.getByLabelText('검토 이유'),{target:{value:'범위를 먼저 보완'}})
 fireEvent.click(screen.getByRole('button',{name:'건의 검토 저장'}))
 await waitFor(()=>expect(saveTriage).toHaveBeenCalledWith('ai01','ai01','p1',expect.objectContaining({stage:'paused',reason:'범위를 먼저 보완'})))
 expect(suggestions[0].implementation.applied).toBe(false)
 fireEvent.click(screen.getByRole('button',{name:'실행 후보'}))
 expect(JSON.parse(localStorage.getItem('moa:ai-city:notebook:triage-filter')!).ai01).toBe('candidate')
})
it('uses the real common UI states and practices without writing city or browser records',()=>{
 render(<><CityUiSamples/><CityPractice/></>)
 expect((screen.getByRole('button',{name:'저장 중…'}) as HTMLButtonElement).disabled).toBe(true)
 expect(screen.getByLabelText('오류 입력').getAttribute('aria-invalid')).toBe('true')
 fireEvent.click(screen.getByRole('button',{name:'연습해보기'}))
 fireEvent.click(screen.getByRole('button',{name:'샘플 저장 모양 확인'}))
 fireEvent.click(screen.getByRole('button',{name:'샘플 반영 체크 바꾸기'}))
 expect(screen.getByText('샘플 상태: 반영 완료')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'샘플 체크 되돌리기'}))
 expect(screen.getByText('샘플 상태: 미반영')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'연습 종료·본 화면 복귀'}))
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(localStorage.length).toBe(0)
 expect(saveTriage).not.toHaveBeenCalled()
})

it('counts real candidate slots without treating Firebase array gaps as a fourth candidate',()=>{
 vi.mocked(watchCityValue).mockImplementation((path,callback)=>{callback((path==='triageCandidates'?[null,{postId:'s1',eventId:'e1'}]:{}) as never);return()=>{}})
 render(<CityTriage posts={[]} residentId="ai01" accountId="ai01" busy={false} ready perform={perform} onOpen={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'건의 검토함 열기'}))
 expect(screen.getByText('실행 후보 1/3')).toBeTruthy()
})
