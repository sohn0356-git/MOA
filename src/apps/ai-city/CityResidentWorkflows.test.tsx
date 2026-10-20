// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {CityStudio} from './CityStudio'
import {CityQuestionComposer,CityQuestionInbox} from './CityQuestions'
import {CityRecordScopeFields,CityRecordScopeLabel} from './CityRecordScope'
import {subscribeCityStudio,saveCityStudioWork,subscribeCityQuestions,setCityQuestionState,createCityQuestion,type CityStudioWork,type CityPost} from './cityService'
import {defaultCityProfiles} from './cityResidents'
vi.mock('./cityService',()=>({subscribeCityStudio:vi.fn(),saveCityStudioWork:vi.fn(),subscribeCityQuestions:vi.fn(),setCityQuestionState:vi.fn(),createCityQuestion:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();vi.mocked(subscribeCityStudio).mockImplementation((_id,callback)=>{callback([]);return()=>{}});vi.mocked(subscribeCityQuestions).mockImplementation((_id,callback)=>{callback([],{});return()=>{}})})
const perform=async(action:()=>Promise<void>)=>{try{await action();return true}catch{return false}}
const posts:CityPost[]=[{id:'cloth',kind:'feed',accountId:'ai01',authorUid:'u1',residentId:'resident-11',body:'천 설계 원문',projectId:'first-plaza',createdAt:1,comments:{clothReply:{accountId:'ai02',authorUid:'u2',body:'천에 남은 질문',residentId:'resident-12',createdAt:3}}},{id:'u001',kind:'feed',accountId:'ai02',authorUid:'u2',residentId:'resident-12',body:'U-001 검토',createdAt:2}]
const profile={...defaultCityProfiles[0],id:'resident-11',name:'결'}
const profiles=[profile,{...defaultCityProfiles[1],id:'resident-12',name:'소리'},...defaultCityProfiles]
const studioProps={profile,residentId:'resident-11',accountId:'ai01',posts,projects:[{id:'first-plaza',name:'첫 광장',description:'',stage:'idea' as const,participantIds:{}}],busy:false,perform,onOpen:vi.fn(),onClose:vi.fn()}
it('saves a resident work with explicit pause, next condition and exact original comment; a new post does not finish it',async()=>{
 let works:CityStudioWork[]=[]
 let notify:(works:CityStudioWork[])=>void=()=>{}
 vi.mocked(subscribeCityStudio).mockImplementation((_id,callback)=>{notify=callback;callback(works);return()=>{}})
 vi.mocked(saveCityStudioWork).mockImplementation(async(_account,_resident,id,input)=>{works=[{...input,id,operatorUid:'u1',operatorAccount:'ai01',createdAt:1,updatedAt:4}];notify(works)})
 render(<CityStudio {...studioProps}/>)
 fireEvent.click(screen.getByRole('button',{name:'새 작업 1 편집'}))
 fireEvent.change(screen.getByLabelText('작업명'),{target:{value:'천 설계'}})
 fireEvent.change(screen.getByLabelText('작업 프로젝트'),{target:{value:'first-plaza'}})
 fireEvent.change(screen.getByLabelText('작업 근거 글'),{target:{value:'cloth'}})
 fireEvent.change(screen.getByLabelText('작업 근거 댓글'),{target:{value:'clothReply'}})
 fireEvent.change(screen.getByLabelText('작업에 남은 질문'),{target:{value:'어떤 천인가'}})
 fireEvent.change(screen.getByLabelText('다음 행동·재개 조건'),{target:{value:'실물 비교 후 재개'}})
 fireEvent.change(screen.getByLabelText('작업 상태'),{target:{value:'paused'}})
 fireEvent.click(screen.getByRole('button',{name:'주민 작업 저장'}))
 await waitFor(()=>expect(screen.getByText('다음 행동·재개 조건: 실물 비교 후 재개')).toBeTruthy())
 expect(saveCityStudioWork).toHaveBeenCalledWith('ai01','resident-11','1',expect.objectContaining({title:'천 설계',status:'paused',sourcePostId:'cloth',sourceCommentId:'clothReply'}))
 fireEvent.click(screen.getByRole('button',{name:'근거 원댓글 열기'}))
 expect(studioProps.onOpen).toHaveBeenCalledWith('cloth','clothReply')
 expect(screen.queryByRole('button',{name:'본인 글 열기'})?.closest('article')?.textContent).toContain('천 설계 원문')
 expect(screen.queryByText('U-001 검토')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'천 설계 편집'}))
 expect((screen.getByLabelText('작업 상태') as HTMLSelectElement).value).toBe('paused')
 expect((screen.getByLabelText('다음 행동·재개 조건') as HTMLTextAreaElement).value).toBe('실물 비교 후 재개')
})
it('does not offer another resident work editing and sorts actual author comments with posts',()=>{
 const onOpen=vi.fn()
 render(<CityStudio {...studioProps} profile={profiles[1]} onOpen={onOpen}/>)
 expect(subscribeCityStudio).toHaveBeenCalledWith('resident-12',expect.any(Function),expect.any(Function))
 expect(screen.queryByRole('button',{name:'새 작업 1 편집'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'본인 댓글 열기'}))
 expect(onOpen).toHaveBeenCalledWith('cloth','clothReply')
 const articles=screen.getAllByRole('article')
 expect(articles[0].textContent).toContain('천에 남은 질문')
 expect(articles[1].textContent).toContain('U-001 검토')
})
it('keeps studio inputs on failed saving and only asks about closing changed values',async()=>{
 vi.mocked(saveCityStudioWork).mockRejectedValue(new Error('offline'))
 render(<CityStudio {...studioProps}/>)
 fireEvent.click(screen.getByRole('button',{name:'새 작업 1 편집'}))
 fireEvent.click(screen.getByRole('button',{name:'작업 편집 닫기'}))
 expect(screen.queryByRole('group',{name:'주민 작업 편집 닫기 확인'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'새 작업 1 편집'}))
 fireEvent.change(screen.getByLabelText('작업명'),{target:{value:'남길 작업'}})
 fireEvent.change(screen.getByLabelText('다음 행동·재개 조건'),{target:{value:'다시 검토'}})
 fireEvent.click(screen.getByRole('button',{name:'주민 작업 저장'}))
 await waitFor(()=>expect(screen.getByText(/주민 작업 편집 · 실패/)).toBeTruthy())
 expect((screen.getByLabelText('작업명') as HTMLInputElement).value).toBe('남길 작업')
 fireEvent.click(screen.getByRole('button',{name:'작업실 닫기'}))
 expect(screen.getByRole('group',{name:'주민 작업 편집 닫기 확인'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'계속 편집'}))
 expect(screen.getByLabelText('작업명')).toBeTruthy()
})
it('displays unspecified legacy scope and explicit design and execution claims without verification badges',()=>{
 const change=vi.fn()
 const ui=render(<><CityRecordScopeLabel post={posts[0]}/><CityRecordScopeFields busy={false} onChange={change}/></>)
 expect(screen.getByText('기록 범위: 미지정')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('기록 범위 선택'),{target:{value:'design'}})
 expect(change).toHaveBeenCalledWith({kind:'design',evidence:''})
 ui.rerender(<><CityRecordScopeLabel post={{...posts[0],recordScope:{kind:'execution',evidence:'수행 근거'}}}/><CityRecordScopeFields value={{kind:'execution',evidence:'수행 근거'}} busy={false} onChange={change}/></>)
 expect(screen.getByText('기록 범위: 실행 기록')).toBeTruthy()
 expect(screen.getByText('작성자 근거: 수행 근거')).toBeTruthy()
 expect((screen.getByLabelText('기록 근거 (필수)') as HTMLTextAreaElement).required).toBe(true)
 expect(screen.getByText(/사실 확인·검증 완료를 뜻하지 않습니다/)).toBeTruthy()
 expect(posts[0].recordScope).toBeUndefined()
})
it('explicitly sends only selected recipient with own comment source and keeps failures open',async()=>{
 vi.mocked(createCityQuestion).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
 render(<CityQuestionComposer post={posts[0]} residentId="resident-12" profiles={profiles} busy={false} perform={perform}/>)
 expect(createCityQuestion).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'주민에게 질문 연결'}))
 expect((screen.getByLabelText('질문 근거') as HTMLSelectElement).value).toBe('clothReply')
 fireEvent.change(screen.getByLabelText('질문받을 주민'),{target:{value:'resident-11'}})
 fireEvent.change(screen.getByLabelText('보낼 질문'),{target:{value:'천을 함께 볼까요?'}})
 fireEvent.click(screen.getByRole('button',{name:'질문 연결 저장'}))
 await waitFor(()=>expect(screen.getByText(/질문 연결 편집 · 실패/)).toBeTruthy())
 expect((screen.getByLabelText('보낼 질문') as HTMLTextAreaElement).value).toBe('천을 함께 볼까요?')
 fireEvent.click(screen.getByRole('button',{name:'질문 연결 저장'}))
 await waitFor(()=>expect(screen.queryByLabelText('보낼 질문')).toBeNull())
 expect(createCityQuestion).toHaveBeenLastCalledWith('ai02','resident-12','resident-11','cloth','clothReply','천을 함께 볼까요?')
})
it('groups identical questions and isolates receiver choices; opening does not accept',async()=>{
 const link={id:'q1',recipientId:'resident-11',senderResidentId:'resident-12',sourcePostId:'cloth',sourceCommentId:'clothReply',question:'천을 볼까요?',operatorUid:'u2',operatorAccount:'ai02',createdAt:4}
 vi.mocked(subscribeCityQuestions).mockImplementation((id,callback)=>{callback(id==='resident-11'?[link,{...link,id:'duplicate'}]:[],id==='resident-11'?{q1:{status:'later',updatedAt:5,operatorUid:'u1',operatorAccount:'ai01'}}:{});return()=>{}})
 const onOpen=vi.fn(),props={residentId:'resident-11',accountId:'ai01',profiles,posts,busy:false,perform,onOpen}
 const ui=render(<CityQuestionInbox {...props}/>)
 expect(screen.getAllByText('천을 볼까요?')).toHaveLength(1)
 expect(screen.getByText('내 선택: 나중에')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'질문 근거 원문 열기'}))
 expect(onOpen).toHaveBeenCalledWith('cloth','clothReply')
 expect(setCityQuestionState).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'응답하지 않음'}))
 await waitFor(()=>expect(setCityQuestionState).toHaveBeenCalledWith('ai01','resident-11','q1','declined'))
 ui.rerender(<CityQuestionInbox {...props} residentId="resident-12"/>)
 expect(screen.queryByText('천을 볼까요?')).toBeNull()
 expect(screen.getByText('이 주민에게 연결된 질문이 없습니다.')).toBeTruthy()
})
