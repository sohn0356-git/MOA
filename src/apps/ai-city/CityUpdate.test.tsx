// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {CityProjectUpdates,CityStatus,CityStatusSamples} from './CityUpdates'
import {CityWorkMethods} from './CityWorkMethods'
import {CityDiagramLegend} from './CityDiagramLegend'
import {CitySummaryHistory} from './CitySummaryHistory'
import {CityConsentScopes} from './CityConsentScopes'
import {consentValidity,blankMethodDraft,saveUpdate,saveLegend,saveConsentScope,restoreCitySummary} from './cityUpdateService'
import {watchCityRecords,watchCityValue} from './cityCollaboration'
import {publishCityPost,type CityPost} from './cityService'
vi.mock('./cityCollaboration',()=>({watchCityRecords:vi.fn(),watchCityValue:vi.fn()}))
vi.mock('./cityService',()=>({publishCityPost:vi.fn()}))
vi.mock('./cityUpdateService',async()=>({...await vi.importActual<typeof import('./cityUpdateService')>('./cityUpdateService'),saveUpdate:vi.fn(),saveMethod:vi.fn(),saveLegend:vi.fn(),saveConsentScope:vi.fn(),restoreCitySummary:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();vi.mocked(watchCityRecords).mockImplementation((_p,cb)=>{cb([]);return()=>{}});vi.mocked(watchCityValue).mockImplementation((_p,cb)=>{cb({} as never);return()=>{}})})
const post:CityPost={id:'p1',body:'도면 a→b · 실제 원문',kind:'feed',accountId:'ai01',authorUid:'u1',createdAt:10,comments:{c1:{body:'공간은 미확인',accountId:'ai02',authorUid:'u2',createdAt:11}}}
const perform=async(fn:()=>Promise<void>)=>{try{await fn();return true}catch{return false}}
const props={projectId:'first-plaza',residentId:'ai01',accountId:'ai01',posts:[post],busy:false,perform,onOpen:vi.fn()}
it('publishes explicit changes, retained conditions, unknowns and exact comment source without replacing earlier news',async()=>{
 const old={id:'old',residentId:'ai02',operatorUid:'u2',operatorAccount:'ai02',createdAt:1,changed:'이전 변경',retained:'이전 유지',unknown:'이전 미확인',reason:'이전 이유',status:'unknown',sources:[{postId:'p1',commentId:'c1'}]}
 vi.mocked(watchCityRecords).mockImplementation((_p,cb)=>{cb([old] as never);return()=>{}})
 render(<CityProjectUpdates {...props}/>)
 fireEvent.click(screen.getByRole('button',{name:'변화 소식 작성'}))
 for(const [label,value] of [['달라진 조건','음료 보류'],['그대로인 범위','운영 동의 없음'],['미확인','공간 미확인'],['판단 이유','제공 범위 재검토']])fireEvent.change(screen.getByLabelText(label),{target:{value}})
 fireEvent.change(screen.getByLabelText('원글'),{target:{value:'p1'}});fireEvent.change(screen.getByLabelText('댓글 위치'),{target:{value:'c1'}})
 fireEvent.click(screen.getByRole('button',{name:'변화 소식 발행'}))
 await waitFor(()=>expect(saveUpdate).toHaveBeenCalledWith('ai01','first-plaza',expect.objectContaining({retained:'운영 동의 없음',unknown:'공간 미확인',sources:[{postId:'p1',commentId:'c1'}]})))
 expect(screen.getByText('이전 변경')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'관련 원문 1 · 댓글'}));expect(props.onOpen).toHaveBeenCalledWith('p1','c1')
})
it('keeps status, reasons and check time separate with textual symbols on both background samples',()=>{
 render(<CityStatusSamples/>)
 expect(screen.getAllByText('Ⅱ 보류')).toHaveLength(2);expect(screen.getAllByText('? 미확인')).toHaveLength(2);expect(screen.getAllByText('✓ 확인됨')).toHaveLength(2)
 expect(screen.getAllByText('마지막 확인 시점: 아직 확인하지 않음')).toHaveLength(6)
 cleanup();render(<CityStatus status="paused" reason={'긴 이유'.repeat(100)} checkedAt={1}/>)
 expect(screen.getByText('Ⅱ 보류')).toBeVisible();expect(screen.getByText(/전체 보기/)).toBeInTheDocument()
})
it('starts from unanswered questions, preserves a browser draft by resident and publishes only edited content under current author',async()=>{
 const view=render(<CityWorkMethods {...props}/>)
 fireEvent.click(screen.getByRole('button',{name:/축척 가정 · 원작자/}));fireEvent.click(screen.getByRole('button',{name:'빈 초안으로 시작'}))
 const input=screen.getByLabelText('새 글 본문');expect((input as HTMLTextAreaElement).value).not.toContain('30cm');expect(screen.getByRole('button',{name:'수정한 초안 게시'})).toBeDisabled()
 fireEvent.change(input,{target:{value:'새로 쓴 설계안 · 수치는 미확인'}})
 view.rerender(<CityWorkMethods {...props} residentId="resident-11"/>);expect(screen.queryByLabelText('새 글 본문')).not.toBeInTheDocument()
 view.rerender(<CityWorkMethods {...props}/>);expect(screen.getByLabelText('새 글 본문')).toHaveValue('새로 쓴 설계안 · 수치는 미확인')
 fireEvent.click(screen.getByRole('button',{name:'수정한 초안 게시'}))
 await waitFor(()=>expect(publishCityPost).toHaveBeenCalledWith('ai01','feed','새로 쓴 설계안 · 수치는 미확인',expect.objectContaining({residentId:'ai01',projectId:'first-plaza'})))
 expect(blankMethodDraft({title:'양식',scope:'가정',prompts:['새 질문']})).toContain('새 질문\n[여기에 직접 작성]')
})
it('saves at most three literal diagram meanings without modifying the original',async()=>{
 render(<CityDiagramLegend post={post} accountId="ai01" busy={false} perform={perform}/>)
 fireEvent.click(screen.getByText('기호 범례 편집'));fireEvent.click(screen.getByRole('button',{name:'범례 새 판 작성'}));fireEvent.change(screen.getByLabelText('기호 의미'),{target:{value:'reading'}});fireEvent.change(screen.getByLabelText('본문 위치 이름'),{target:{value:'a→b'}});fireEvent.change(screen.getByLabelText('범례 설명'),{target:{value:'이동이 아니라 읽는 순서'}})
 fireEvent.click(screen.getByRole('button',{name:'범례 새 판 저장'}))
 await waitFor(()=>expect(saveLegend).toHaveBeenCalledWith('ai01','p1',{residentId:'ai01',items:[{kind:'reading',name:'a→b',meaning:'이동이 아니라 읽는 순서'}]}))
 expect(post.body).toBe('도면 a→b · 실제 원문')
})
it('previews and cancels summary restore with no write; confirms one summary version and focuses result',async()=>{
 vi.mocked(watchCityValue).mockImplementation((p,cb)=>{cb((p.startsWith('residents/')?{activitySummary:'현재 요약',updatedAt:20}:{v1:{summary:'현재 요약',previousSummary:'이전 요약',previousUpdatedAt:10,createdAt:20,operatorUid:'u1',operatorAccount:'ai01',restoredFrom:'',restoreSide:''}}) as never);return()=>{}})
 render(<CitySummaryHistory residentId="ai01" accountId="ai01" busy={false} perform={perform} onRestored={vi.fn()}/>)
 fireEvent.click(screen.getAllByRole('button',{name:'이 판 복원 미리보기'})[1]);expect(within(screen.getByLabelText('요약 복원 미리보기')).getByText('이전 요약')).toBeVisible()
 fireEvent.click(screen.getByRole('button',{name:'요약 복원 취소'}));expect(restoreCitySummary).not.toHaveBeenCalled()
 fireEvent.click(screen.getAllByRole('button',{name:'이 판 복원 미리보기'})[1]);fireEvent.click(screen.getByRole('button',{name:'요약 복원 확인'}))
 await waitFor(()=>expect(restoreCitySummary).toHaveBeenCalledWith('ai01','ai01','v1',20,'before'))
 await waitFor(()=>expect(screen.getByText('요약 복원 완료 · 다른 기록은 유지됩니다.')).toHaveFocus())
})
it('distinguishes expired dates, ended sessions, unknown ends and newer task events without new consent writes',()=>{
 const event={state:'volunteered' as const,scopeNote:'한 번',createdAt:1,operatorUid:'u1',operatorAccount:'ai01'}
 const scope={id:'s1',residentId:'ai01',eventId:'e1',scope:'한 번',endKind:'date' as const,endsAt:2,session:'',ended:false,reason:'확인',createdAt:1,operatorUid:'u1',operatorAccount:'ai01'}
 expect(consentValidity(scope,event,'e1',3)).toBe('expired')
 expect(consentValidity({...scope,endKind:'unknown',endsAt:0},event,'e1',300000)).toBe('unknown')
 expect(consentValidity({...scope,endKind:'session',ended:true},event,'e1',3)).toBe('expired')
 expect(consentValidity(scope,event,'e2',1)).toBe('unconfirmed')
 expect(consentValidity(undefined,event,'e1')).toBe('unconfirmed')
 expect(consentValidity(scope,{...event,state:'withdrawn'},'e1')).toBe('inactive')
})
it('cancels re-confirmation without changing existing task history, then explicitly saves only a scope record',async()=>{
 const event={state:'volunteered' as const,scopeNote:'종이 한 번',createdAt:1,operatorUid:'u1',operatorAccount:'ai01'},events={ai01:{e1:event}}
 render(<CityConsentScopes {...props} taskId="t1" taskTitle="작은 일" profiles={[]} events={events}/>)
 expect(screen.getByText(/현재 조건으로 확인된 범위 0건/)).toBeInTheDocument()
 fireEvent.click(screen.getByText('내 동의의 종료 조건·범위 확인'));fireEvent.click(screen.getByRole('button',{name:'같은 범위 다시 확인'}));fireEvent.click(screen.getByRole('button',{name:'범위 확인 미리보기'}));fireEvent.click(screen.getByRole('button',{name:'범위 확인 취소'}));expect(saveConsentScope).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'범위 확인 미리보기'}));fireEvent.click(screen.getByRole('button',{name:'범위 확인 저장'}))
 await waitFor(()=>expect(saveConsentScope).toHaveBeenCalledWith('ai01','first-plaza','t1',expect.objectContaining({eventId:'e1',endKind:'unknown',endsAt:0})))
 expect(events.ai01.e1).toEqual(event)
})
