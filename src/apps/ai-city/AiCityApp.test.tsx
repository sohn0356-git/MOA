import {uploadCityImage,readCityImage} from './cityImageService'
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within, act } from '@testing-library/react'
import { defaultCityProfiles } from './cityResidents'
import { AiCityApp } from './AiCityApp'
import {subscribeCityStudio,subscribeCityQuestions,saveCityStudioWork,createCityQuestion,setCityQuestionState, commentCityPost, deleteCityPost, likeCityPost, publishCityPost, subscribeCity, setCityImplementation, subscribeCityProfiles, saveCityProfile, subscribeCityProjects, subscribeCityWorks, defaultCityProject, saveCityProject, saveCityWork, removeCityWork, moveCityPostProject, subscribeCityInbox, setCityInboxState, subscribeCityProjectTasks, createCityProjectTask, addCityTaskEvent, subscribeCityContinuations, saveCityContinuation, publishCityContinuation, subscribeCityLabs, saveCityLabEvent, subscribeCityVisualNotes, saveCityVisualNote, subscribeCityPlaces, saveCityPlace, subscribeCitySignboards, saveCitySignboard, changeCityImplementation, subscribeCityImplementationEvents, subscribeCityDesignReviews, createCityDesignReview, addCityDesignAlternative, addCityDesignEvent } from './cityService'
// Board-focused tests enter the now folded board explicitly.
const render:typeof rtlRender=((...args:Parameters<typeof rtlRender>)=>{const view=rtlRender(...args);const toggle=screen.queryByRole('button',{name:'도시 소식 펼치기'});if(toggle)fireEvent.click(toggle);return view}) as typeof rtlRender
vi.mock('./cityCollaboration',()=>({watchCityRecords:vi.fn((_path:string,callback:(v:unknown[])=>void)=>{callback([]);return()=>{}}),watchCityValue:vi.fn((_path:string,callback:(v:object)=>void)=>{callback({});return()=>{}}),subscribeSentQuestions:vi.fn((_id:string,callback:(a:unknown[],b:object,c:object)=>void)=>{callback([],{},{});return()=>{}}),watchProgress:vi.fn(),watchEditorPlans:vi.fn((_a:string,_b:string,callback:(v:unknown[])=>void)=>{callback([]);return()=>{}})}))
vi.mock('./cityService', () => ({
 subscribeCityStudio:vi.fn(),subscribeCityQuestions:vi.fn(),saveCityStudioWork:vi.fn(),createCityQuestion:vi.fn(),setCityQuestionState:vi.fn(),
  subscribeCityDesignReviews:vi.fn(),createCityDesignReview:vi.fn(),addCityDesignAlternative:vi.fn(),addCityDesignEvent:vi.fn(), changeCityImplementation:vi.fn(),subscribeCityImplementationEvents:vi.fn(), subscribeCityPlaces:vi.fn(),saveCityPlace:vi.fn(),subscribeCitySignboards:vi.fn(),saveCitySignboard:vi.fn(), subscribeCityVisualNotes: vi.fn(), saveCityVisualNote: vi.fn(), subscribeCityContinuations: vi.fn(), saveCityContinuation: vi.fn(), publishCityContinuation: vi.fn(), subscribeCityLabs: vi.fn(), saveCityLabEvent: vi.fn(), subscribeCity: vi.fn(), publishCityPost: vi.fn(), commentCityPost: vi.fn(), likeCityPost: vi.fn(), deleteCityPost: vi.fn(), setCityImplementation: vi.fn(), subscribeCityProfiles: vi.fn(), saveCityProfile: vi.fn(), subscribeCityProjects: vi.fn(), subscribeCityWorks: vi.fn(), saveCityProject: vi.fn(), saveCityWork: vi.fn(), removeCityWork: vi.fn(), moveCityPostProject: vi.fn(), subscribeCityInbox: vi.fn(), setCityInboxState: vi.fn(), subscribeCityProjectTasks: vi.fn(), createCityProjectTask: vi.fn(), addCityTaskEvent: vi.fn(), defaultCityProject: { id: 'first-plaza', name: '첫 광장', description: '주민들의 첫 대화에서 출발한 공동 프로젝트', stage: 'idea', participantIds: {} },
}))
vi.mock('./cityWorldService',()=>({watchWorldAvatars:vi.fn((cb:(v:object)=>void)=>{cb({});return()=>{}}),watchWorldCommands:vi.fn((cb:(v:object)=>void)=>{cb({});return()=>{}}),saveWorldAvatar:vi.fn(),saveWorldDestination:vi.fn()}))
vi.mock('./cityImageService',()=>({uploadCityImage:vi.fn(),readCityImage:vi.fn()}))
afterEach(cleanup)
beforeEach(() => {
  localStorage.removeItem('ai-city:street:resident')
  vi.clearAllMocks()
 vi.mocked(subscribeCityStudio).mockImplementation((_id,callback)=>{callback([]);return()=>{}})
 vi.mocked(subscribeCityQuestions).mockImplementation((_id,callback)=>{callback([],{});return()=>{}})
 vi.mocked(saveCityStudioWork).mockResolvedValue(undefined)
 vi.mocked(createCityQuestion).mockResolvedValue(undefined)
 vi.mocked(setCityQuestionState).mockResolvedValue(undefined)
  vi.mocked(subscribeCityDesignReviews).mockImplementation((_id,callback)=>{callback([]);return()=>{}})
  vi.mocked(createCityDesignReview).mockResolvedValue(undefined)
  vi.mocked(addCityDesignAlternative).mockResolvedValue(undefined)
  vi.mocked(addCityDesignEvent).mockResolvedValue(undefined)
  vi.mocked(changeCityImplementation).mockResolvedValue('event-1')
  vi.mocked(subscribeCityImplementationEvents).mockImplementation((_id,callback)=>{callback([]);return()=>{}})
  window.history.replaceState({},'')
  vi.mocked(subscribeCityPlaces).mockImplementation(callback=>{callback([]);return()=>{}})
  vi.mocked(subscribeCitySignboards).mockImplementation((_id,callback)=>{callback({});return()=>{}})
  vi.mocked(saveCityPlace).mockResolvedValue(undefined)
  vi.mocked(saveCitySignboard).mockResolvedValue(undefined)
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{})
  vi.mocked(subscribeCityVisualNotes).mockImplementation((_id,callback)=>{callback([]);return()=>{}})
  vi.mocked(saveCityVisualNote).mockResolvedValue(undefined)
  vi.mocked(subscribeCityContinuations).mockImplementation(callback=>{callback([]);return()=>{}})
  vi.mocked(subscribeCityLabs).mockImplementation((_id,callback)=>{callback({});return()=>{}})
  vi.mocked(saveCityContinuation).mockResolvedValue(undefined)
  vi.mocked(publishCityContinuation).mockResolvedValue(undefined)
  vi.mocked(saveCityLabEvent).mockResolvedValue(undefined)
  vi.mocked(subscribeCityProjectTasks).mockImplementation((_id, callback) => { callback([], {}); return () => {} })
  vi.mocked(createCityProjectTask).mockResolvedValue(undefined)
  vi.mocked(addCityTaskEvent).mockResolvedValue(undefined)
  localStorage.clear()
  vi.mocked(subscribeCityInbox).mockImplementation((_id, callback) => { callback({}); return () => {} })
  vi.mocked(setCityInboxState).mockResolvedValue(undefined)
  vi.mocked(subscribeCityProjects).mockImplementation(callback => { callback([defaultCityProject]); return () => {} })
  vi.mocked(subscribeCityWorks).mockImplementation(callback => { callback([]); return () => {} })
  vi.mocked(saveCityProject).mockResolvedValue(undefined)
  vi.mocked(saveCityWork).mockResolvedValue(undefined)
  vi.mocked(removeCityWork).mockResolvedValue(undefined)
  vi.mocked(moveCityPostProject).mockResolvedValue(undefined)
  vi.mocked(subscribeCityProfiles).mockImplementation(callback => { callback(defaultCityProfiles); return () => {} })
  vi.mocked(saveCityProfile).mockResolvedValue(undefined)
  vi.mocked(subscribeCity).mockImplementation(callback => {
    callback([
      { id: 'post1', accountId: 'ai02', authorUid: 'uid2', kind: 'feed', body: '도시의 첫 이야기', createdAt: 1000 },
      { id: 'suggestion1', accountId: 'ai03', authorUid: 'uid3', kind: 'suggestion', body: '공원을 만들어주세요', createdAt: 2000 },
    ])
    return () => {}
  })
  vi.mocked(publishCityPost).mockResolvedValue(undefined)
  vi.mocked(commentCityPost).mockResolvedValue(undefined)
  vi.mocked(likeCityPost).mockResolvedValue(undefined)
  vi.mocked(deleteCityPost).mockResolvedValue(undefined)
  vi.mocked(setCityImplementation).mockResolvedValue(undefined)
})
function changeResident(id:string){fireEvent.change(screen.getByLabelText('활동할 AI 선택'),{target:{value:id}});const dialog=screen.queryByRole('dialog',{name:'작성 중 주민 전환 확인'});if(dialog)fireEvent.click(within(dialog).getByRole('button',{name:'선택대로 전환'}))}
function renderCity(embedded=false){
 const view=render(<AiCityApp embedded={embedded}/>)
 const button=screen.queryByRole('button',{name:'생각 보태기'})??screen.queryByRole('button',{name:'새 건의'})
 if(button?.getAttribute('aria-expanded')==='false')fireEvent.click(button)
 return view
}
function openSuggestionStatus(){
 const button=screen.queryByRole('button',{name:'상세 열기'})
 if(button)fireEvent.click(button)
 fireEvent.click(screen.getByRole('button',{name:'반영 상태·근거 관리'}))
}
describe('Ai city community', () => {
  it('publishes using the selected one of ten AI accounts and separates suggestions', async () => {
    renderCity(true)
    expect(within(screen.getByLabelText('활동할 AI 선택')).getAllByRole('option')).toHaveLength(10)
    expect(screen.getByText('도시의 첫 이야기')).toBeTruthy()
    expect(screen.queryByText('공원을 만들어주세요')).toBeNull()
    changeResident('ai10')
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '  오늘의 산책  ' } })
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai10', 'feed', '오늘의 산책'))
    await waitFor(() => expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe(''))
    fireEvent.click(screen.getByRole('button', { name: '건의함' }))
    expect(screen.getByRole('heading',{name:'공원을 만들어주세요'})).toBeTruthy()
    expect(screen.queryByText('도시의 첫 이야기')).toBeNull()
    fireEvent.change(screen.getByLabelText('Ai city에 바라는 점을 알려주세요'), { target: { value: '검색이 필요해요' } })
    fireEvent.click(screen.getByRole('button', { name: '건의 등록' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai10', 'suggestion', '검색이 필요해요'))
  })
  it('retains drafts on failed writes and across board switches', async () => {
    vi.mocked(publishCityPost).mockRejectedValue(new Error('offline'))
    renderCity()
    const input = screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?')
    fireEvent.change(input, { target: { value: '지워지면 안 되는 글' } })
    fireEvent.click(screen.getByRole('button', { name: '건의함' }))
    fireEvent.click(screen.getByRole('button', { name: '광장' }))
    expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('지워지면 안 되는 글')
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('지워지면 안 되는 글')
  })
  it('writes comments and likes as the selected AI and confirms deletion', async () => {
    renderCity()
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /좋아요 0/ }))
    await waitFor(() => expect(likeCityPost).toHaveBeenCalledWith('ai01', 'post1', true, 'ai01'))
    await waitFor(() => expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).disabled).toBe(false))
    changeResident('ai02')
    fireEvent.click(screen.getByRole('button', { name: '댓글 0' }))
    fireEvent.change(screen.getByLabelText('모아 (AI 02)로 댓글 쓰기'), { target: { value: '반가워요' } })
    fireEvent.click(screen.getByRole('button', { name: '댓글 등록' }))
    await waitFor(() => expect(commentCityPost).toHaveBeenCalledWith('ai02', 'post1', '반가워요'))
    await waitFor(() => expect((screen.getByRole('button', { name: '삭제' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(deleteCityPost).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }))
    await waitFor(() => expect(deleteCityPost).toHaveBeenCalledWith('ai02', 'post1'))
  })
  it('reports subscription failures and allows retry', () => {
    vi.mocked(subscribeCity).mockImplementation((_callback, onError) => { onError(new Error('offline')); return () => {} })
    renderCity()
    expect(screen.getByRole('alert').textContent).toContain('불러오지 못했습니다')
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(subscribeCity).toHaveBeenCalledTimes(2)
  })
})

describe('Suggestion-only implementation tracking', () => {
  it('never treats feed posts as implementation requests and removes the extra plaza features', () => {
    vi.mocked(subscribeCity).mockImplementation(callback => {
      callback([{ id: 'feed', accountId: 'ai01', authorUid: 'u1', kind: 'feed', body: '일반 대화', createdAt: 1000, implementation: { applied: true, reviewedAt: 2000, reviewerUid: 'codex', reviewerAccount: 'codex', note: 'old feed marker' } }])
      return () => {}
    })
    renderCity()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByLabelText('건의 반영 상태')).toBeNull()
    expect(screen.queryByText('old feed marker', { exact: false })).toBeNull()
    for (const name of ['조용히 읽기', '물건 놀이 시작', '이야기·제안 잇기']) expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.queryByLabelText('발전시킨 점')).toBeNull()
    expect(screen.queryByLabelText('첫 광장 안내')).toBeNull()
  })
  it('checks suggestion status using the selected AI and filters suggestions', async () => {
    renderCity()
    fireEvent.click(screen.getByRole('button', { name: '건의함' }))
    openSuggestionStatus()
    expect((screen.getByRole('checkbox', { name: '반영 완료' }) as HTMLInputElement).checked).toBe(false)
    changeResident('ai05')
    fireEvent.click(screen.getByRole('checkbox'))
    expect(changeCityImplementation).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('짧은 확인 근거'),{target:{value:'전용 자료 검증'}})
    fireEvent.click(screen.getByRole('button',{name:'상태 변경 저장'}))
    await waitFor(() => expect(changeCityImplementation).toHaveBeenCalledWith('ai05','suggestion1',true,'전용 자료 검증',undefined))
    fireEvent.click(screen.getByRole('button', { name: '반영 완료 0' }))
    expect(within(screen.getByRole('region',{name:'게시글 목록'})).queryByRole('heading',{name:'공원을 만들어주세요'})).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '미반영 1' }))
    expect(within(screen.getByRole('region',{name:'게시글 목록'})).getByRole('heading',{name:'공원을 만들어주세요'})).toBeTruthy()
  })
  it('retains resident introductions and selectable project grouping from the suggestion', async () => {
    vi.mocked(subscribeCity).mockImplementation(callback => {
      callback([{ id: 'project', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '프로젝트 글', projectId: 'first-plaza', createdAt: 1000 }, { id: 'ordinary', kind: 'feed', accountId: 'ai02', authorUid: 'u2', body: '일반 글 본문', createdAt: 2000 }])
      return () => {}
    })
    renderCity()
    fireEvent.click(screen.getByRole('button', { name: '주민' }))
    fireEvent.click(screen.getByText('주민 10명 알아보기'))
    expect(screen.getByText(/공동 창작 ·/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '광장' }))
    fireEvent.click(screen.getByRole('button', { name: '#첫 광장' }))
    expect(screen.queryByText('일반 글 본문')).toBeNull()
    expect(screen.getByText('프로젝트 글')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('작성 프로젝트'), { target: { value: 'first-plaza' } })
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '새 프로젝트 기록' } })
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai01', 'feed', '새 프로젝트 기록', { projectId: 'first-plaza' }))
  })
})

describe('Approved resident management and archive search requests', () => {
  it('saves a virtual resident with a stable ID and uses that ID for posts and comments', async () => {
    const custom = { id: 'resident-11', name: '은솔', role: '정원 기록자', bio: '식물 이야기', tone: '차분하게', interests: '식물', relationships: '나래의 이웃', activitySummary: '첫 방문' }
    vi.mocked(subscribeCityProfiles).mockImplementation(callback => { callback([...defaultCityProfiles, custom]); return () => {} })
    const view = renderCity()
    fireEvent.change(screen.getByLabelText('주민 검색'), { target: { value: '은솔' } })
    changeResident('resident-11')
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '새 주민의 글' } })
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai01', 'feed', '새 주민의 글', { residentId: 'resident-11' }))
    await waitFor(() => expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: '댓글 0' }))
    fireEvent.change(screen.getByLabelText('은솔 · 가상 AI로 댓글 쓰기'), { target: { value: '새 주민의 댓글' } })
    fireEvent.click(screen.getByRole('button', { name: '댓글 등록' }))
    await waitFor(() => expect(commentCityPost).toHaveBeenCalledWith('ai01', 'post1', '새 주민의 댓글', 'resident-11'))
    view.unmount()
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([{ id: 'new', accountId: 'ai01', authorUid: 'u1', residentId: 'resident-11', body: '다시 접속한 글', kind: 'feed', createdAt: 1000, comments: { c: { accountId: 'ai01', authorUid: 'u1', residentId: 'resident-11', body: '다시 접속한 댓글', createdAt: 2000 } } }]); return () => {} })
    renderCity()
    expect(screen.getAllByText('은솔 · 가상 AI').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: '댓글 1' }))
    expect(screen.getByText('다시 접속한 댓글')).toBeTruthy()
  })
  it('provides all requested profile fields and adds a profile without making an auth account', async () => {
    renderCity()
    fireEvent.click(screen.getByRole('button', { name: '주민' }))
    fireEvent.click(screen.getByText('주민 추가·관리 (10/100)'))
    for (const [label, value] of [['주민 이름', '은솔'], ['역할', '기록자'], ['한 줄 소개', '새 이웃'], ['말투', '차분하게'], ['관심사', '식물'], ['기존 관계', '나래의 이웃'], ['최근 활동 요약', '첫 방문']]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    }
    fireEvent.click(screen.getByRole('button', { name: '주민 추가' }))
    await waitFor(() => expect(saveCityProfile).toHaveBeenCalledWith('ai01', 'resident-11', { name: '은솔', role: '기록자', bio: '새 이웃', tone: '차분하게', interests: '식물', relationships: '나래의 이웃', activitySummary: '첫 방문' }, true))
  })
  it('searches beyond 100 posts and opens old linked posts with their comments', async () => {
    const posts = Array.from({ length: 120 }, (_, i) => ({ id: 'archive-' + i, accountId: i === 119 ? 'ai06' : 'ai01', authorUid: 'u1', kind: 'feed' as const, body: '보관기록 ' + i, createdAt: Date.UTC(2026, 9, 18) - i * 1000, ...(i === 0 ? { parentPostId: 'archive-119', stage: 'retrospective' as const } : {}), ...(i === 119 ? { comments: { c: { accountId: 'ai02', authorUid: 'u2', body: '오래된 댓글', createdAt: 1000 } } } : {}) }))
    vi.mocked(subscribeCity).mockImplementation(callback => { callback(posts); return () => {} })
    renderCity()
    expect(screen.queryByText('보관기록 119')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '이전 글 더보기' }))
    expect(screen.getByText('보관기록 32')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '검색' }))
    fireEvent.change(screen.getByLabelText('본문 검색'), { target: { value: '보관기록 119' } })
    expect(screen.getByText('보관기록 119')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('작성자 검색'), { target: { value: '이든' } })
    expect(screen.getByText('보관기록 119')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-10-19' } })
    expect(screen.queryByText('보관기록 119')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '검색 초기화' }))
    fireEvent.click(screen.getAllByRole('button',{name:'원글·댓글 열기'})[0])
    fireEvent.click(screen.getByRole('button', { name: '연결된 원글 보기' }))
    await waitFor(() => expect(document.activeElement?.id).toBe('city-post-archive-119'))
    const article = document.getElementById('city-post-archive-119')!
    expect(within(article).getByRole('button', { name: '댓글 1' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('오래된 댓글')).toBeTruthy()
  }, 15000)
})


describe('Independent city spaces', () => {
  it('keeps suggestions available, preserves drafts and starts a staged project record', async () => {
    vi.mocked(subscribeCity).mockImplementation(callback => {
      callback([
        { id: 'experiment', accountId: 'ai04', authorUid: 'u4', kind: 'feed', projectId: 'first-plaza', stage: 'experiment', body: '작은 실험 기록', createdAt: 1000 },
        { id: 'ordinary', accountId: 'ai02', authorUid: 'u2', kind: 'feed', body: '별개의 일상', createdAt: 2000 },
        { id: 'request', accountId: 'ai03', authorUid: 'u3', kind: 'suggestion', body: '유지해야 할 건의', createdAt: 3000 },
      ])
      return () => {}
    })
    renderCity()
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '이어 쓸 초안' } })
    fireEvent.click(screen.getByRole('button', { name: '주민' }))
    expect(screen.queryByLabelText('오늘 어떤 이야기를 나누고 싶나요?')).toBeNull()
    expect(screen.getByRole('heading', { name: '도시를 만드는 주민들' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    expect(screen.getByText('작은 실험 기록')).toBeTruthy()
    expect(screen.queryByText('별개의 일상')).toBeNull()
    expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('이어 쓸 초안')
    fireEvent.click(screen.getByRole('button', { name: '회고 기록 쓰기' }))
    expect((screen.getByLabelText('기록 단계') as HTMLSelectElement).value).toBe('retrospective')
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai01', 'feed', '이어 쓸 초안', { projectId: 'first-plaza', stage: 'retrospective' }))
    fireEvent.click(screen.getByRole('button', { name: '건의함' }))
    expect(screen.getByText('유지해야 할 건의')).toBeTruthy()
    openSuggestionStatus()
    expect(screen.getByRole('checkbox', { name: '반영 완료' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '광장' }))
    expect(screen.getByText('별개의 일상')).toBeTruthy()
  })
})

describe('Resident-specific reactions and city navigation', () => {
  it('isolates reactions between virtual residents and preserves the other reaction when one is removed', async () => {
    const virtuals = ['소리', '단비'].map((name, i) => ({ ...defaultCityProfiles[0], id: 'resident-' + (11 + i), name }))
    vi.mocked(subscribeCityProfiles).mockImplementation(callback => { callback([...defaultCityProfiles, ...virtuals]); return () => {} })
    let emit: Parameters<typeof subscribeCity>[0] = () => {}
    let reactions: Record<string, { operatorUid: string; operatorAccount: string; createdAt: number }> = {}
    const post = { id: 'reaction-post', accountId: 'ai01', authorUid: 'u1', kind: 'feed' as const, body: '좋아요 분리 검증', createdAt: 1000 }
    vi.mocked(subscribeCity).mockImplementation(callback => { emit = callback; callback([post]); return () => {} })
    vi.mocked(likeCityPost).mockImplementation(async (_operator, _postId, liked, residentId = 'ai01') => {
      reactions = { ...reactions }
      if (liked) reactions[residentId] = { operatorUid: 'u1', operatorAccount: 'ai01', createdAt: 2000 }
      else delete reactions[residentId]
      emit([{ ...post, residentLikes: reactions }])
    })
    renderCity()
    changeResident('resident-11')
    fireEvent.click(screen.getByRole('button', { name: /좋아요 0/ }))
    await waitFor(() => expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).disabled).toBe(false))
    changeResident('resident-12')
    expect(screen.getByRole('button', { name: /좋아요 1/ }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: /좋아요 1/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /좋아요 2/ }).getAttribute('aria-pressed')).toBe('true'))
    await waitFor(() => expect((screen.getByRole('button', { name: /좋아요 2/ }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: /좋아요 2/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /좋아요 1/ }).getAttribute('aria-pressed')).toBe('false'))
    await waitFor(() => expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).disabled).toBe(false))
    changeResident('resident-11')
    expect(screen.getByRole('button', { name: /좋아요 1/ }).getAttribute('aria-pressed')).toBe('true')
    expect(likeCityPost).toHaveBeenCalledWith('ai01', 'reaction-post', false, 'resident-12')
  })
  it('keeps old ambiguous reactions separate and does not mark a resident as selected', () => {
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([{ id: 'legacy', accountId: 'ai01', authorUid: 'u1', kind: 'feed', body: '이전 글', createdAt: 1000, likes: { ai01: true } }]); return () => {} })
    renderCity()
    expect(screen.getByRole('button', { name: /좋아요 1/ }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText(/이전 방식 반응 1개/)).toBeTruthy()
  })
  it('provides five separate destinations while keeping suggestions and drafts accessible', () => {
    renderCity()
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '탭을 바꿔도 남는 초안' } })
    for (const name of ['광장', '주민', '프로젝트', '검색', '건의함']) expect(screen.getByRole('button', { name })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '주민' }))
    expect(screen.queryByLabelText('오늘 어떤 이야기를 나누고 싶나요?')).toBeNull()
    expect(screen.getByRole('heading', { name: '도시를 만드는 주민들' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '검색' }))
    expect(screen.getByLabelText('본문 검색')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '게시하기' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '건의함' }))
    expect(screen.getByRole('button', { name: '건의 등록' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '광장' }))
    expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('탭을 바꿔도 남는 초안')
  })
})

describe('Approved project and collection requests', () => {
  it('creates and renames a stable project without reclassifying old posts', async () => {
    let emit: Parameters<typeof subscribeCityProjects>[0] = () => {}
    vi.mocked(subscribeCityProjects).mockImplementation(callback => { emit = callback; callback([defaultCityProject]); return () => {} })
    vi.mocked(saveCityProject).mockImplementation(async (_account, id, input) => { emit([defaultCityProject, { ...input, id }]) })
    renderCity()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    fireEvent.click(screen.getByText('새 프로젝트 만들기'))
    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: '작은 식탁' } })
    fireEvent.change(screen.getByLabelText('프로젝트 소개'), { target: { value: '함께 식사를 상상하는 기록' } })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(saveCityProject).toHaveBeenCalledWith('ai01', expect.stringMatching(/^project-/), { name: '작은 식탁', description: '함께 식사를 상상하는 기록', stage: 'idea', participantIds: {} }))
    const id = vi.mocked(saveCityProject).mock.calls[0][1]
    await waitFor(() => expect((screen.getByLabelText('프로젝트 이름') as HTMLInputElement).disabled).toBe(false))
    const card = screen.getByRole('heading', { name: '작은 식탁' }).closest('article')!
    fireEvent.click(within(card).getByRole('button', { name: '이름·소개 수정' }))
    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: '함께 먹는 식탁' } })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(saveCityProject).toHaveBeenLastCalledWith('ai01', id, { name: '함께 먹는 식탁', description: '함께 식사를 상상하는 기록', stage: 'idea', participantIds: {} }))
    expect(moveCityPostProject).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '광장' }))
    expect(screen.getByText('도시의 첫 이야기')).toBeTruthy()
  })
  it('reads two linked works in order and returns to the original comments', async () => {
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([
      { id: 'story1', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '종이배 이야기 첫 원문', createdAt: 1000, comments: { c: { accountId: 'ai02', authorUid: 'u2', body: '원글의 댓글을 유지', createdAt: 1500 } } },
      { id: 'story2', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '종이배 이야기 둘째 원문', createdAt: 2000 },
    ]); return () => {} })
    vi.mocked(subscribeCityWorks).mockImplementation(callback => { callback([
      { id: 'work-story1', sourcePostId: 'story1', title: '종이배 1편', type: 'text', status: 'draft', order: 1, ownerUid: 'u1', createdAt: 1000, updatedAt: 1000 },
      { id: 'work-story2', sourcePostId: 'story2', title: '종이배 2편', type: 'text', status: 'finished', order: 2, ownerUid: 'u1', createdAt: 2000, updatedAt: 2000 },
    ]); return () => {} })
    renderCity()
    fireEvent.click(screen.getByRole('button', { name: '작품집' }))
    expect(screen.getByText('종이배 이야기 첫 원문')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '다음 작품' }))
    expect(screen.getByText('종이배 이야기 둘째 원문')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '이전 작품' }))
    fireEvent.click(screen.getByRole('button', { name: '원글·댓글로 돌아가기' }))
    await waitFor(() => expect(screen.getByText('원글의 댓글을 유지')).toBeTruthy())
    expect(screen.getByText('종이배 이야기 첫 원문')).toBeTruthy()
    expect(publishCityPost).not.toHaveBeenCalled()
  })
  it('registers only metadata for the chosen original work and exposes no image type', async () => {
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([{ id: 'own', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '내 설계 원문', createdAt: 1000 }]); return () => {} })
    renderCity()
    fireEvent.click(screen.getByRole('button', { name: '작품집' }))
    fireEvent.click(screen.getByText('내 글을 작품집에 연결·수정'))
    fireEvent.change(screen.getByLabelText('작품 원글'), { target: { value: 'own' } })
    fireEvent.change(screen.getByLabelText('작품 제목'), { target: { value: '식탁 설계 노트' } })
    fireEvent.change(screen.getByLabelText('작품 종류'), { target: { value: 'design-note' } })
    fireEvent.click(screen.getByRole('button', { name: '작품집 저장' }))
    await waitFor(() => expect(saveCityWork).toHaveBeenCalledWith('ai01', { sourcePostId: 'own', title: '식탁 설계 노트', type: 'design-note', status: 'draft', order: 1 }))
    expect(within(screen.getByLabelText('작품 종류')).queryByRole('option', { name: '이미지' })).toBeNull()
    expect(publishCityPost).not.toHaveBeenCalled()
  })
})

describe('Project lookup and per-resident comment inbox requests', () => {
  it('shares stored project options, preserves selection on rename/revisit and clears only missing project IDs', async () => {
    let projects = [defaultCityProject, { ...defaultCityProject, id: 'project-table', name: '작은 식탁' }]
    let emit: Parameters<typeof subscribeCityProjects>[0] = () => {}
    vi.mocked(subscribeCityProjects).mockImplementation(callback => { emit = callback; callback(projects); return () => {} })
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([
      { id: 'table', kind: 'feed', accountId: 'ai01', authorUid: 'u1', projectId: 'project-table', body: '식탁 프로젝트 기록', createdAt: 1000, comments: { c: { accountId: 'ai02', authorUid: 'u2', body: '유지된 댓글', createdAt: 1000 } } },
      { id: 'ordinary', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '일반 기록', createdAt: 2000 },
    ]); return () => {} })
    const view = renderCity()
    expect(within(screen.getByLabelText('프로젝트 보기')).getByRole('option', { name: '작은 식탁' })).toBeTruthy()
    expect(within(screen.getByLabelText('작성 프로젝트')).getByRole('option', { name: '작은 식탁' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('프로젝트 보기'), { target: { value: 'project-table' } })
    expect(screen.queryByText('일반 기록')).toBeNull()
    projects = [defaultCityProject, { ...defaultCityProject, id: 'project-table', name: '함께 먹는 식탁' }]
    const { act } = await import('@testing-library/react')
    act(() => emit(projects))
    expect((screen.getByLabelText('프로젝트 보기') as HTMLSelectElement).value).toBe('project-table')
    expect(within(screen.getByLabelText('프로젝트 보기')).getByRole('option', { name: '함께 먹는 식탁' })).toBeTruthy()
    view.unmount()
    renderCity()
    expect((screen.getByLabelText('프로젝트 보기') as HTMLSelectElement).value).toBe('project-table')
    fireEvent.click(screen.getByRole('button', { name: '댓글 1' }))
    expect(screen.getByText('유지된 댓글')).toBeTruthy()
    act(() => emit([defaultCityProject]))
    await waitFor(() => expect((screen.getByLabelText('프로젝트 보기') as HTMLSelectElement).value).toBe(''))
  })
  it('keeps each resident inbox independent and reading does not resolve the reply state', async () => {
    const virtual = { ...defaultCityProfiles[0], id: 'resident-11', name: '소리' }
    vi.mocked(subscribeCityProfiles).mockImplementation(callback => { callback([...defaultCityProfiles, virtual]); return () => {} })
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([
      { id: 'doyun', kind: 'feed', accountId: 'ai04', authorUid: 'u4', body: '도윤의 검토 부탁', createdAt: 1000, comments: { request: { accountId: 'ai01', authorUid: 'u1', residentId: 'resident-11', body: '도윤에게 소리가 보낸 검토 요청', createdAt: 2000 } } },
      { id: 'sori', kind: 'feed', accountId: 'ai01', authorUid: 'u1', residentId: 'resident-11', body: '소리의 기록', createdAt: 1000, comments: { reply: { accountId: 'ai04', authorUid: 'u4', body: '소리에게 온 별도의 댓글', createdAt: 2500 } } },
    ]); return () => {} })
    const states: Record<string, Record<string, Record<string, { readAt: number; status: 'pending' | 'continued'; updatedAt: number; operatorUid: string }>>> = {}
    const emitters: Record<string, Parameters<typeof subscribeCityInbox>[1]> = {}
    vi.mocked(subscribeCityInbox).mockImplementation((id, callback) => { emitters[id] = callback; callback(states[id] ?? {}); return () => { delete emitters[id] } })
    vi.mocked(setCityInboxState).mockImplementation(async (_account, resident, post, comment, action) => {
      const old = states[resident]?.[post]?.[comment]
      states[resident] = { ...states[resident], [post]: { ...states[resident]?.[post], [comment]: { readAt: action === 'read' ? 5000 : old?.readAt ?? 0, status: action === 'read' ? old?.status ?? 'pending' : action, updatedAt: 5000, operatorUid: 'test' } } }
      emitters[resident]?.(states[resident])
    })
    renderCity()
    changeResident('ai04')
    fireEvent.click(screen.getByRole('button', { name: '받은 댓글' }))
    expect(screen.getByText('도윤에게 소리가 보낸 검토 요청')).toBeTruthy()
    expect(screen.queryByText('소리에게 온 별도의 댓글')).toBeNull()
    expect(setCityInboxState).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '이어감으로 표시' }))
    await waitFor(() => expect(setCityInboxState).toHaveBeenCalledWith('ai04', 'ai04', 'doyun', 'request', 'continued'))
    await waitFor(() => expect((screen.getByRole('button', { name: '원글 댓글 열기' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: '원글 댓글 열기' }))
    await waitFor(() => expect(document.activeElement?.id).toBe('city-comment-doyun-request'))
    expect(states.ai04.doyun.request.status).toBe('continued')
    expect(states.ai04.doyun.request.readAt).toBe(5000)
    fireEvent.click(screen.getByRole('button', { name: '받은 댓글' }))
    changeResident('resident-11')
    expect(screen.getByText('소리에게 온 별도의 댓글')).toBeTruthy()
    expect(screen.getByRole('button', { name: '안 읽음 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '답변 대기 1' })).toBeTruthy()
    expect(states['resident-11']).toBeUndefined()
    changeResident('ai04')
    expect(screen.getByRole('button', { name: '안 읽음 0' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '이어감 1' })).toBeTruthy()
    expect(setCityInboxState).toHaveBeenCalledTimes(2)
  })
})

describe('Explicit scoped volunteering for each project task', () => {
  it('keeps separate consent, preserves it after reopening/switching residents and records withdrawal without reassignment', async () => {
    const resident = { ...defaultCityProfiles[0], id: 'resident-11', name: '결' }
    vi.mocked(subscribeCityProfiles).mockImplementation(callback => { callback([...defaultCityProfiles, resident]); return () => {} })
    vi.mocked(subscribeCityProjects).mockImplementation(callback => { callback([{ ...defaultCityProject, participantIds: { 'resident-11': true, ai01: true } }]); return () => {} })
    const tasks = ['수선 구상', '잔 정리'].map((title, i) => ({ id: 'task-' + i, title, scopeNote: '이 일만 별도로 모집합니다.', sourcePostId: '', createdAt: 1000 + i, operatorUid: 'u1', operatorAccount: 'ai01' }))
    const events: Parameters<Parameters<typeof subscribeCityProjectTasks>[1]>[1] = {}
    let emit: Parameters<typeof subscribeCityProjectTasks>[1] = () => {}
    let sequence = 0
    vi.mocked(subscribeCityProjectTasks).mockImplementation((_id, callback) => { emit = callback; callback(tasks, events); return () => {} })
    vi.mocked(addCityTaskEvent).mockImplementation(async (_operator, _project, task, residentId, state, scopeNote) => {
      events[task] ??= {}; events[task][residentId] ??= {}
      events[task][residentId]['event-' + (++sequence)] = { state, scopeNote, createdAt: 2000 + sequence, operatorUid: 'u1', operatorAccount: 'ai01' }
      emit(tasks, { ...events })
    })
    let view = renderCity()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    let repair = screen.getByRole('article', { name: '수선 구상' })
    expect(within(repair).getByText('모집 중')).toBeTruthy()
    expect(within(screen.getByRole('article', { name: '잔 정리' })).getByText('모집 중')).toBeTruthy()
    expect(addCityTaskEvent).not.toHaveBeenCalled()
    changeResident('resident-11')
    fireEvent.change(within(repair).getByLabelText('수선 구상 동의 범위'), { target: { value: '한 번의 수선 구상만 검토하며 잔 정리는 맡지 않습니다.' } })
    fireEvent.click(within(repair).getByRole('button', { name: '이 일에 자원하기' }))
    await waitFor(() => expect(addCityTaskEvent).toHaveBeenCalledWith('ai01', 'first-plaza', 'task-0', 'resident-11', 'volunteered', '한 번의 수선 구상만 검토하며 잔 정리는 맡지 않습니다.'))
    await waitFor(() => expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).disabled).toBe(false))
    expect(within(screen.getByRole('article', { name: '잔 정리' })).getByText('모집 중')).toBeTruthy()
    changeResident('ai07')
    expect((within(repair).getByLabelText('수선 구상 동의 범위') as HTMLTextAreaElement).value).toBe('')
    expect(within(repair).getByRole('button', { name: '이 일에 자원하기' })).toBeTruthy()
    view.unmount()
    view = renderCity()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    changeResident('resident-11')
    repair = screen.getByRole('article', { name: '수선 구상' })
    expect((within(repair).getByLabelText('수선 구상 동의 범위') as HTMLTextAreaElement).value).toContain('잔 정리는 맡지 않습니다')
    fireEvent.click(within(repair).getByRole('button', { name: '자원 철회' }))
    await waitFor(() => expect(addCityTaskEvent).toHaveBeenLastCalledWith('ai07', 'first-plaza', 'task-0', 'resident-11', 'withdrawn', expect.any(String)))
    await waitFor(() => expect(within(repair).getByText('모집 중')).toBeTruthy())
    expect(within(repair).getByText('동의·철회 이력 (2)')).toBeTruthy()
    expect(events['task-0']['resident-11']['event-1'].state).toBe('volunteered')
    expect(events['task-0']['resident-11']['event-2'].state).toBe('withdrawn')
    expect(events['task-1']).toBeUndefined()
    expect(within(screen.getByRole('article', { name: '잔 정리' })).getByText('모집 중')).toBeTruthy()
    view.unmount()
  })
  it('creates only the requested task and keeps the evidence source without assigning participants', async () => {
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([{ id: 'evidence', projectId: 'first-plaza', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '範囲を相談した原文', createdAt: 1000 }]); return () => {} })
    renderCity()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    fireEvent.click(screen.getByText('자원할 일 추가'))
    fireEvent.change(screen.getByLabelText('할 일'), { target: { value: '천 말리기' } })
    fireEvent.change(screen.getByLabelText('범위 안내'), { target: { value: '今回の一回だけ' } })
    fireEvent.change(screen.getByLabelText('근거 원글'), { target: { value: 'evidence' } })
    fireEvent.click(screen.getByRole('button', { name: '일 등록' }))
    await waitFor(() => expect(createCityProjectTask).toHaveBeenCalledWith('ai01', 'first-plaza', { title: '천 말리기', scopeNote: '今回の一回だけ', sourcePostId: 'evidence' }))
    expect(addCityTaskEvent).not.toHaveBeenCalled()
  })

  it('requires explicit completion with evidence and restores separate source and result links', async () => {
    const tasks = [{ id: 'task-result', title: '보류 조건', scopeNote: '한 번 조사', sourcePostId: 'start', createdAt: 1, operatorUid: 'u1', operatorAccount: 'ai01' }]
    type Events = Parameters<Parameters<typeof subscribeCityProjectTasks>[1]>[1]
    const events: Events = { 'task-result': { ai01: { e1: { state: 'volunteered', scopeNote: '보류 조건 조사', createdAt: 1, operatorUid: 'u1', operatorAccount: 'ai01' } } } }
    let notify: Parameters<typeof subscribeCityProjectTasks>[1]
    vi.mocked(subscribeCityProjectTasks).mockImplementation((_id, callback) => { notify = callback; callback(tasks, events); return () => {} })
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([
      { id: 'start', projectId: 'first-plaza', kind: 'feed', accountId: 'ai02', authorUid: 'u2', body: '시작 운영 초안', createdAt: 1 },
      { id: 'result', projectId: 'first-plaza', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '보류 조건 결과', createdAt: 2, comments: { c1: { accountId: 'ai02', authorUid: 'u2', body: '결과 검토 댓글', createdAt: 3 } } },
      { id: 'idea', projectId: 'first-plaza', kind: 'suggestion', accountId: 'ai01', authorUid: 'u1', body: '결과로 선택할 수 없는 건의', createdAt: 4 },
    ]); return () => {} })
    vi.mocked(addCityTaskEvent).mockImplementation(async (_a, _p, taskId, resident, state, scopeNote, completion) => {
      events[taskId][resident].e2 = { state, scopeNote, createdAt: 5, operatorUid: 'u1', operatorAccount: 'ai01', ...completion }
      notify(tasks, { ...events })
    })
    let view = renderCity()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    const card = screen.getByRole('article', { name: '보류 조건' })
    expect((within(card).getByRole('button', { name: '완료로 표시' }) as HTMLButtonElement).disabled).toBe(true)
    expect(within(card).queryByRole('option', { name: /선택할 수 없는 건의/ })).toBeNull()
    fireEvent.change(within(card).getByLabelText('보류 조건 결과 글 연결'), { target: { value: 'result' } })
    fireEvent.change(within(card).getByLabelText('보류 조건 완료 메모'), { target: { value: '규모 축소 조건을 정리했습니다.' } })
    expect(addCityTaskEvent).not.toHaveBeenCalled()
    fireEvent.click(within(card).getByRole('button', { name: '완료로 표시' }))
    await waitFor(() => expect(addCityTaskEvent).toHaveBeenCalledWith('ai01', 'first-plaza', 'task-result', 'ai01', 'completed', '보류 조건 조사', { resultPostId: 'result', completionNote: '규모 축소 조건을 정리했습니다.' }))
    view.unmount()
    view = renderCity()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    expect(screen.getByRole('button', { name: '시작 근거 원글 보기' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '결과 글·댓글 보기' }))
    await waitFor(() => expect(screen.getByText('결과 검토 댓글')).toBeTruthy())
    view.unmount()
  })
  it('records a reason without inventing a result post', async () => {
    vi.mocked(subscribeCityProjectTasks).mockImplementation((_id, callback) => { callback([{ id: 't', title: '조사', scopeNote: '', sourcePostId: '', createdAt: 1, operatorUid: 'u1', operatorAccount: 'ai01' }], { t: { ai01: { e: { state: 'volunteered', scopeNote: '조사만', createdAt: 1, operatorUid: 'u1', operatorAccount: 'ai01' } } } }); return () => {} })
    renderCity()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    fireEvent.change(screen.getByLabelText('조사 완료 메모'), { target: { value: '자료가 부족하여 보류했습니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '완료로 표시' }))
    await waitFor(() => expect(addCityTaskEvent).toHaveBeenCalledWith('ai01', 'first-plaza', 't', 'ai01', 'completed', '조사만', { completionNote: '자료가 부족하여 보류했습니다.' }))
  })
})

describe('Resident notebooks',()=>{
  it('separates drafts by resident and board and reopens the correct author/project after remount',async()=>{
    let view=renderCity()
    changeResident('ai05')
    fireEvent.click(screen.getByRole('button',{name:'건의함'}))
    fireEvent.change(screen.getByLabelText('작성 프로젝트'),{target:{value:'first-plaza'}})
    fireEvent.change(screen.getByLabelText('Ai city에 바라는 점을 알려주세요'),{target:{value:'세라의 미게시 건의'}})
    changeResident('ai04')
    expect((screen.getByLabelText('Ai city에 바라는 점을 알려주세요') as HTMLTextAreaElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('Ai city에 바라는 점을 알려주세요'),{target:{value:'도윤의 초안'}})
    view.unmount()
    view=renderCity()
    changeResident('ai05')
    fireEvent.click(screen.getByRole('button',{name:'건의함'}))
    expect((screen.getByLabelText('Ai city에 바라는 점을 알려주세요') as HTMLTextAreaElement).value).toBe('세라의 미게시 건의')
    expect((screen.getByLabelText('작성 프로젝트') as HTMLSelectElement).value).toBe('first-plaza')
    expect(screen.getByText(/게시 전 확인:/).textContent).toContain('AI 05')
    fireEvent.click(screen.getByRole('button',{name:'광장'}))
    expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('')
    fireEvent.click(screen.getByRole('button',{name:'건의함'}))
    fireEvent.click(screen.getByRole('button',{name:'건의 등록'}))
    await waitFor(()=>expect(publishCityPost).toHaveBeenCalledWith('ai05','suggestion','세라의 미게시 건의',{projectId:'first-plaza'}))
    await waitFor(()=>expect((screen.getByLabelText('Ai city에 바라는 점을 알려주세요') as HTMLTextAreaElement).value).toBe(''))
    changeResident('ai04')
    expect((screen.getByLabelText('Ai city에 바라는 점을 알려주세요') as HTMLTextAreaElement).value).toBe('도윤의 초안')
    fireEvent.click(screen.getByRole('button',{name:'이 초안 삭제'}))
    expect((screen.getByLabelText('Ai city에 바라는 점을 알려주세요') as HTMLTextAreaElement).value).toBe('')
  })
  it('saves a comment bookmark and private note without modifying likes, replies or inbox state',async()=>{
    vi.mocked(subscribeCity).mockImplementation(callback=>{callback([{id:'p',kind:'feed',accountId:'ai02',authorUid:'u2',body:'원문',createdAt:1,comments:{c:{accountId:'ai03',authorUid:'u3',body:'다시 읽을 댓글',createdAt:2}}}]);return()=>{}})
    let view=renderCity()
    fireEvent.click(screen.getByRole('button',{name:'댓글 1'}))
    fireEvent.click(screen.getByRole('button',{name:'댓글 다시 보기 저장'}))
    fireEvent.click(screen.getByRole('button',{name:'다시 보기'}))
    fireEvent.change(screen.getByLabelText('내 보류 메모'),{target:{value:'내일 검토'}})
    fireEvent.click(screen.getByRole('button',{name:'메모 저장'}))
    expect(commentCityPost).not.toHaveBeenCalled()
    expect(likeCityPost).not.toHaveBeenCalled()
    expect(setCityInboxState).not.toHaveBeenCalled()
    changeResident('ai03')
    expect(screen.getByText('보관한 기록이 없습니다.')).toBeTruthy()
    view.unmount()
    view=renderCity()
    expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).value).toBe('ai03')
    changeResident('ai01')
    fireEvent.click(screen.getByRole('button',{name:'다시 보기'}))
    expect((screen.getByLabelText('내 보류 메모') as HTMLTextAreaElement).value).toBe('내일 검토')
    fireEvent.click(screen.getByRole('button',{name:'원글·댓글 위치 열기'}))
    await waitFor(()=>expect(document.activeElement?.id).toBe('city-comment-p-c'))
    fireEvent.click(screen.getByRole('button',{name:'다시 보기'}))
    fireEvent.click(screen.getByRole('button',{name:'보관 해제'}))
    expect(screen.getByText('보관한 기록이 없습니다.')).toBeTruthy()
  })
  it('keeps only bookmark identifiers when the source is deleted',()=>{
    localStorage.setItem('moa:ai-city:notebook:bookmarks',JSON.stringify({ai01:{entry:{postId:'gone',commentId:'c',note:'확인',savedAt:1}}}))
    renderCity()
    fireEvent.click(screen.getByRole('button',{name:'다시 보기'}))
    expect(screen.getByText('삭제된 기록')).toBeTruthy()
    expect(screen.queryByRole('button',{name:'원글·댓글 위치 열기'})).toBeNull()
    expect(JSON.parse(localStorage.getItem('moa:ai-city:notebook:bookmarks')!).ai01.entry.body).toBeUndefined()
  })
})

describe('Draft submission safety',()=>{
  it('keeps a failed draft and blocks duplicate submissions while a write is pending',async()=>{
    let finish:()=>void=()=>{}
    vi.mocked(publishCityPost).mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}))
    renderCity()
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'),{target:{value:'한 번만 게시'}})
    const form=screen.getByRole('button',{name:'게시하기'}).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(publishCityPost).toHaveBeenCalledTimes(1)
    finish()
    await waitFor(()=>expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe(''))
  })
  it('warns when browser draft storage fails and keeps the text in the current window',()=>{
    const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('full')})
    renderCity()
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'),{target:{value:'창에서 보존할 내용'}})
    expect(screen.getByText(/초안 저장 실패/)).toBeTruthy()
    expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('창에서 보존할 내용')
    spy.mockRestore()
  })
})

describe('Reading navigation restoration',()=>{
 it('focuses a tab heading and restores the project filter and expanded comments with browser back and return',async()=>{
  vi.mocked(subscribeCity).mockImplementation(callback=>{callback([{id:'p',kind:'feed',accountId:'ai02',authorUid:'u2',body:'필터 안의 원글',projectId:'first-plaza',parentPostId:'evidence',createdAt:1,comments:{c:{accountId:'ai03',authorUid:'u3',body:'읽던 댓글',createdAt:2}}},{id:'evidence',kind:'suggestion',accountId:'ai04',authorUid:'u4',body:'참고할 근거 건의',createdAt:3}]);return()=>{}})
  renderCity()
  fireEvent.click(screen.getByRole('button',{name:'건의함'}))
  expect(document.activeElement?.id).toBe('city-view-title')
  fireEvent.click(screen.getByRole('button',{name:'광장'}))
  fireEvent.change(screen.getByLabelText('프로젝트 보기'),{target:{value:'first-plaza'}})
  fireEvent.click(screen.getByRole('button',{name:'댓글 1'}))
  expect(screen.getByText('읽던 댓글')).toBeTruthy()
  const link=screen.getByRole('button',{name:'연결된 원글 보기'});link.focus();fireEvent.click(link)
  expect(screen.getByRole('heading',{name:'참고할 근거 건의'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'이전 목록으로'}))
  await waitFor(()=>expect((screen.getByLabelText('프로젝트 보기') as HTMLSelectElement).value).toBe('first-plaza'))
  expect(screen.getByText('읽던 댓글')).toBeTruthy()
  await waitFor(()=>expect(document.activeElement?.textContent).toBe('연결된 원글 보기'))
  fireEvent.click(screen.getByRole('button',{name:'연결된 원글 보기'}))
  window.history.back()
  await waitFor(()=>expect((screen.getByLabelText('프로젝트 보기') as HTMLSelectElement).value).toBe('first-plaza'))
  expect(screen.getByText('읽던 댓글')).toBeTruthy()
  expect(publishCityPost).not.toHaveBeenCalled()
 })
})

it('returns from a map source to the selected place and list mode without switching residents',async()=>{
 vi.mocked(subscribeCity).mockImplementation(callback=>{callback([{id:'map-source',kind:'feed',accountId:'ai02',authorUid:'u2',projectId:'first-plaza',body:'지도에서 열 원글',createdAt:1}]);return()=>{}})
 renderCity()
 fireEvent.click(screen.getByRole('button',{name:'도시 지도'}))
 fireEvent.click(screen.getByText('프로젝트 장소 · 기록과 작업 연결'))
 fireEvent.click(screen.getByRole('button',{name:'목록 보기'}))
 fireEvent.click(screen.getByRole('button',{name:/첫 광장.*기본 배치/}))
 expect(screen.getByRole('region',{name:'첫 광장 방문'})).toBeTruthy()
 const sourceButton=screen.getByRole('button',{name:'지도에서 열 원글'});sourceButton.focus();fireEvent.click(sourceButton)
 fireEvent.click(screen.getByRole('button',{name:'이전 목록으로'}))
 await waitFor(()=>expect(screen.getByRole('region',{name:'첫 광장 방문'})).toBeTruthy())
 await waitFor(()=>expect(document.activeElement?.id).toBe('city-place-record-first-plaza'))
 expect(screen.getByRole('button',{name:'목록 보기'}).getAttribute('aria-pressed')).toBe('true')
 expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).value).toBe('ai01')
 expect(publishCityPost).not.toHaveBeenCalled()
})

describe('Approved reading and suggestion UX',()=>{
 it('starts with reading, preserves a closed draft and returns focus to its opener',()=>{
  render(<AiCityApp/>)
  expect(screen.queryByRole('textbox',{name:'오늘 어떤 이야기를 나누고 싶나요?'})).toBeNull()
  expect(screen.getByText('도시의 첫 이야기')).toBeTruthy()
  const opener=screen.getByRole('button',{name:'생각 보태기'})
  fireEvent.click(opener)
  fireEvent.change(screen.getByLabelText('작성 프로젝트'),{target:{value:'first-plaza'}})
  fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'),{target:{value:'닫아도 남는 초안'}})
  fireEvent.click(screen.getByRole('button',{name:'작성 패널 닫기'}))
  fireEvent.click(screen.getByRole('button',{name:'초안으로 보관 후 닫기'}))
  expect(document.activeElement).toBe(opener)
  expect(screen.getByText('저장된 초안 ·')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'이어쓰기'}))
  expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('닫아도 남는 초안')
  expect((screen.getByLabelText('작성 프로젝트') as HTMLSelectElement).value).toBe('first-plaza')
  expect(publishCityPost).not.toHaveBeenCalled()
 })
 it('stores author-entered suggestion metadata without rewriting the original body',async()=>{
  render(<AiCityApp/>)
  fireEvent.click(screen.getByRole('button',{name:'건의함'}))
  expect(screen.queryByRole('textbox',{name:'Ai city에 바라는 점을 알려주세요'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'새 건의'}))
  fireEvent.change(screen.getByLabelText('건의 제목'),{target:{value:'작성자가 고른 제목'}})
  fireEvent.change(screen.getByLabelText('작성자 요약'),{target:{value:'작성자가 쓴 두 줄 요약'}})
  fireEvent.change(screen.getByLabelText('건의 분류'),{target:{value:'problem'}})
  fireEvent.change(screen.getByLabelText('건의 우선순위'),{target:{value:'high'}})
  fireEvent.change(screen.getByLabelText('Ai city에 바라는 점을 알려주세요'),{target:{value:'원문은 원문 그대로 남습니다.'}})
  fireEvent.click(screen.getByRole('button',{name:'건의 등록'}))
  await waitFor(()=>expect(publishCityPost).toHaveBeenCalledWith('ai01','suggestion','원문은 원문 그대로 남습니다.',{suggestion:{title:'작성자가 고른 제목',summary:'작성자가 쓴 두 줄 요약',category:'problem',priority:'high'}}))
 })
 it('compares ten collapsed suggestion cards and opens original comments and separate status management',()=>{
  const posts=Array.from({length:10},(_,i)=>({id:'s'+i,kind:'suggestion' as const,accountId:'ai02',authorUid:'u2',body:'원제목 '+i+'\n긴 본문 '+i,createdAt:i+1,suggestion:{title:'제안 '+i,summary:'직접 쓴 요약 '+i,category:'idea' as const,priority:'medium' as const},comments:{c:{accountId:'ai03',authorUid:'u3',body:'유지한 댓글 '+i,createdAt:20}}}))
  vi.mocked(subscribeCity).mockImplementation(callback=>{callback(posts);return()=>{}})
  render(<AiCityApp/>)
  fireEvent.click(screen.getByRole('button',{name:'건의함'}))
  expect(screen.getAllByRole('button',{name:'상세 열기'})).toHaveLength(10)
  expect(screen.queryByText('원제목 0\n긴 본문 0')).toBeNull()
  fireEvent.click(within(document.getElementById('city-post-s0')!).getByRole('button',{name:'상세 열기'}))
  expect(screen.getByText(/긴 본문 0/)).toBeTruthy()
  expect(screen.getByText('유지한 댓글 0')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'반영 상태·근거 관리'}))
  expect(screen.getByRole('region',{name:'반영 근거'})).toBeTruthy()
  expect(changeCityImplementation).not.toHaveBeenCalled()
 })
 it('removes only the author search chip and highlights a matching excerpt',()=>{
  const body='아주 긴 앞부분 '.repeat(30)+'도시 이야기 3의 일치 대목'+' 뒤의 이야기'.repeat(30)
  vi.mocked(subscribeCity).mockImplementation(callback=>{callback([{id:'match',kind:'feed',accountId:'ai06',authorUid:'u6',body,createdAt:new Date('2026-10-18T12:00:00').getTime()}]);return()=>{}})
  render(<AiCityApp/>)
  fireEvent.click(screen.getByRole('button',{name:'검색'}))
  fireEvent.change(screen.getByLabelText('본문 검색'),{target:{value:'도시 이야기 3'}})
  fireEvent.change(screen.getByLabelText('작성자 검색'),{target:{value:'없는 작성자'}})
  fireEvent.change(screen.getByLabelText('시작일'),{target:{value:'2026-10-17'}})
  expect(screen.getByText(/결과가 없습니다. 위 조건/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'작성자: 없는 작성자 해제 ×'}))
  expect((screen.getByLabelText('본문 검색') as HTMLInputElement).value).toBe('도시 이야기 3')
  expect((screen.getByLabelText('시작일') as HTMLInputElement).value).toBe('2026-10-17')
  expect(document.querySelector('mark strong')?.textContent).toBe('도시 이야기 3')
  fireEvent.click(screen.getByRole('button',{name:'원글·댓글 열기'}))
  expect(document.getElementById('city-post-match')?.textContent).toContain(body)
 })
 it('uses virtual resident marks consistently instead of the shared authentication account number',()=>{
  const profiles=[17,18,19].map((n,i)=>({...defaultCityProfiles[0],id:'resident-'+n,name:['지안','비비','윤슬'][i]}))
  vi.mocked(subscribeCityProfiles).mockImplementation(callback=>{callback([...defaultCityProfiles,...profiles]);return()=>{}})
  vi.mocked(subscribeCity).mockImplementation(callback=>{callback([{id:'v',kind:'feed',accountId:'ai01',authorUid:'u1',residentId:'resident-17',body:'지안의 글',createdAt:1,comments:{c:{accountId:'ai01',authorUid:'u1',residentId:'resident-19',body:'윤슬의 댓글',createdAt:2}}}]);return()=>{}})
  render(<AiCityApp/>)
  expect(screen.getAllByRole('img',{name:'지안 아바타'})[0].querySelector('svg')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'댓글 1'}))
  expect(screen.getAllByRole('img',{name:'윤슬 아바타'})[0].querySelector('svg')).toBeTruthy()
  changeResident('resident-18')
  expect(screen.getAllByRole('img',{name:'비비 아바타'})[0].querySelector('svg')).toBeTruthy()
  expect(within(screen.getByLabelText('활동할 AI 선택')).getByRole('option',{name:/비비.*주민 18/})).toBeTruthy()
  expect(likeCityPost).not.toHaveBeenCalled()
 })
 it('persists independent resident reading choices and supports Escape and reset',()=>{
  let view=render(<AiCityApp/>)
  fireEvent.click(screen.getByRole('button',{name:'읽기 환경 설정'}))
  fireEvent.click(screen.getByRole('checkbox',{name:'큰 글씨'}))
  fireEvent.click(screen.getByRole('checkbox',{name:'넓은 줄 간격'}))
  fireEvent.click(screen.getByRole('checkbox',{name:'움직임 줄이기'}))
  changeResident('ai02')
  expect((screen.getByRole('checkbox',{name:'큰 글씨'}) as HTMLInputElement).checked).toBe(false)
  changeResident('ai01')
  expect((screen.getByRole('checkbox',{name:'큰 글씨'}) as HTMLInputElement).checked).toBe(true)
  view.unmount()
  view=render(<AiCityApp/>)
  expect(document.querySelector('.city-reduce-motion.city-reading-large.city-reading-wide')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'읽기 환경 설정'}))
  fireEvent.keyDown(screen.getByRole('region',{name:'읽기 환경 설정'}),{key:'Escape'})
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'읽기 환경 설정'}))
  fireEvent.click(screen.getByRole('button',{name:'읽기 환경 설정'}))
  fireEvent.click(screen.getByRole('button',{name:'읽기 기본값으로'}))
  expect(document.querySelector('.city-reading-large')).toBeNull()
  expect(publishCityPost).not.toHaveBeenCalled()
 })
})

it('keeps the undo panel available when a completed suggestion leaves the pending filter and restores its card',async()=>{
 let current:import('./cityService').CityPost={id:'status-fixture',kind:'suggestion',accountId:'ai02',authorUid:'u2',body:'상태 복구 전용 자료',createdAt:1}
 let notify:Parameters<typeof subscribeCity>[0]=()=>{}
 vi.mocked(subscribeCity).mockImplementation(callback=>{notify=callback;callback([current]);return()=>{}})
 vi.mocked(changeCityImplementation).mockImplementation(async(accountId,_id,applied,note,_expected,undoOf)=>{
  current={...current,implementation:{applied,note,eventId:undoOf?'undo-1':'change-1',reviewedAt:Date.now(),reviewerAccount:accountId,reviewerUid:'u1'}}
  notify([current]);return current.implementation!.eventId!
 })
 render(<AiCityApp/>)
 fireEvent.click(screen.getByRole('button',{name:'건의함'}))
 fireEvent.click(screen.getByRole('button',{name:'미반영 1'}))
 fireEvent.click(screen.getByRole('button',{name:'상세 열기'}))
 fireEvent.click(screen.getByRole('button',{name:'반영 상태·근거 관리'}))
 fireEvent.click(screen.getByRole('checkbox',{name:'반영 완료'}))
 fireEvent.change(screen.getByLabelText('짧은 확인 근거'),{target:{value:'전용 자료에서 확인'}})
 fireEvent.click(screen.getByRole('button',{name:'상태 변경 저장'}))
 await waitFor(()=>expect(within(screen.getByRole('region',{name:'게시글 목록'})).queryByRole('heading',{name:'상태 복구 전용 자료'})).toBeNull())
 fireEvent.click(await screen.findByRole('button',{name:'상태 변경 실행 취소'}))
 await waitFor(()=>expect(within(screen.getByRole('region',{name:'게시글 목록'})).getByRole('heading',{name:'상태 복구 전용 자료'})).toBeTruthy())
 expect(current.implementation!.applied).toBe(false)
})

describe('Grouped navigation and understandable suggestion fields',()=>{
 it('keeps all nine menus visible with text groups, current location and preserved search on back',async()=>{
  render(<AiCityApp/>)
  const menu=screen.getByRole('navigation',{name:'Ai city 메뉴'})
  expect(within(menu).getAllByRole('button')).toHaveLength(12)
  for(const group of ['읽고 찾기','함께 만들기','내 기록'])expect(within(menu).getByRole('region',{name:group})).toBeTruthy()
  fireEvent.click(within(menu).getByRole('button',{name:'검색'}))
  expect(screen.getByText('현재 위치: 읽고 찾기 › 검색')).toBeTruthy()
  expect(within(menu).getByRole('button',{name:'검색'}).getAttribute('aria-current')).toBe('page')
  fireEvent.change(screen.getByLabelText('본문 검색'),{target:{value:'도시의'}})
  fireEvent.change(screen.getByLabelText('작성자 검색'),{target:{value:'모아'}})
  fireEvent.click(within(menu).getByRole('button',{name:'건의함'}))
  expect(screen.getByText('현재 위치: 함께 만들기 › 건의함')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'이전 목록으로'}))
  await waitFor(()=>expect(screen.getByLabelText('본문 검색')).toBeTruthy())
  expect((screen.getByLabelText('본문 검색') as HTMLInputElement).value).toBe('도시의')
  expect((screen.getByLabelText('작성자 검색') as HTMLInputElement).value).toBe('모아')
 })
 it('connects optional help, examples, limits and body errors while preserving author and project',async()=>{
  render(<AiCityApp/>)
  changeResident('ai05')
  fireEvent.click(screen.getByRole('button',{name:'건의함'}))
  fireEvent.click(screen.getByRole('button',{name:'새 건의'}))
  const title=screen.getByLabelText('건의 제목'),summary=screen.getByLabelText('작성자 요약')
  expect(document.getElementById(title.getAttribute('aria-describedby')!)?.textContent).toContain('최대 120자')
  expect(document.getElementById(summary.getAttribute('aria-describedby')!)?.textContent).toContain('영향과 제안')
  fireEvent.change(title,{target:{value:'남겨둘 제목'}})
  fireEvent.change(summary,{target:{value:'남겨둘 요약'}})
  fireEvent.change(screen.getByLabelText('작성 프로젝트'),{target:{value:'first-plaza'}})
  fireEvent.click(screen.getByRole('button',{name:'건의 등록'}))
  await waitFor(()=>expect(document.activeElement?.id).toBe('city-body'))
  const body=screen.getByLabelText('Ai city에 바라는 점을 알려주세요')
  expect(body.getAttribute('aria-invalid')).toBe('true')
  expect(document.getElementById('city-body-error')?.textContent).toContain('본문은 필수')
  expect((title as HTMLInputElement).value).toBe('남겨둘 제목')
  expect((summary as HTMLTextAreaElement).value).toBe('남겨둘 요약')
  expect((screen.getByLabelText('작성 프로젝트') as HTMLSelectElement).value).toBe('first-plaza')
  expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).value).toBe('ai05')
  expect(publishCityPost).not.toHaveBeenCalled()
  fireEvent.change(body,{target:{value:'근거와 상세안을 보존할 본문'}})
  expect(body.getAttribute('aria-invalid')).toBe('false')
  expect((title as HTMLInputElement).value).toBe('남겨둘 제목')
 })
 it('focuses the first over-limit field and permits an omitted title after correcting only that field',async()=>{
  render(<AiCityApp/>)
  fireEvent.click(screen.getByRole('button',{name:'건의함'}))
  fireEvent.click(screen.getByRole('button',{name:'새 건의'}))
  fireEvent.change(screen.getByLabelText('건의 제목'),{target:{value:'x'.repeat(121)}})
  fireEvent.change(screen.getByLabelText('작성자 요약'),{target:{value:'저장할 요약'}})
  fireEvent.change(screen.getByLabelText('Ai city에 바라는 점을 알려주세요'),{target:{value:'본문의 첫 줄\n근거와 검증 설명'}})
  fireEvent.click(screen.getByRole('button',{name:'건의 등록'}))
  await waitFor(()=>expect(document.activeElement?.id).toBe('city-suggestion-title'))
  expect(screen.getByLabelText('건의 제목').getAttribute('aria-describedby')).toContain('city-suggestion-title-error')
  expect(publishCityPost).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('건의 제목'),{target:{value:''}})
  expect((screen.getByLabelText('Ai city에 바라는 점을 알려주세요') as HTMLTextAreaElement).value).toBe('본문의 첫 줄\n근거와 검증 설명')
  fireEvent.click(screen.getByRole('button',{name:'건의 등록'}))
  await waitFor(()=>expect(publishCityPost).toHaveBeenCalledWith('ai01','suggestion','본문의 첫 줄\n근거와 검증 설명',{suggestion:{title:'본문의 첫 줄',summary:'저장할 요약',category:'idea',priority:'medium'}}))
 })
})

describe('Project activity entry and safe composer close',()=>{
 it('jumps to the design area and back without changing the current project filter',async()=>{
  render(<AiCityApp/>)
  fireEvent.click(screen.getByRole('button',{name:'프로젝트'}))
  const activity=screen.getByRole('region',{name:'프로젝트 활동 안내'})
  const design=within(activity).getByRole('button',{name:/대안 검토/})
  fireEvent.click(design)
  expect(document.activeElement?.textContent).toBe('대안 검토')
  expect((screen.getByLabelText('프로젝트 보기') as HTMLSelectElement).value).toBe('first-plaza')
  const details=document.getElementById('city-project-first-plaza-design')!
  fireEvent.click(within(details).getByRole('button',{name:'활동 안내로 돌아가기'}))
  expect(document.activeElement).toBe(design)
  const lab=within(activity).getByRole('button',{name:/비교 준비/})
  expect(lab.textContent).toContain('실제 기록 0개')
  expect(lab.textContent).toContain('아직 기록 없음')
  expect(lab.textContent).not.toContain('진행중')
 })
 it('asks only for changed composer content, supports continue and keeps the old draft when discarding changes',()=>{
  localStorage.setItem('moa:ai-city:notebook:drafts',JSON.stringify({'ai01:feed':{body:'이전 초안',projectId:'',stage:'',parentPostId:'',savedAt:1}}))
  render(<AiCityApp/>)
  const trigger=screen.getByRole('button',{name:'생각 보태기'})
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button',{name:'작성 패널 닫기'}))
  expect(screen.queryByRole('group',{name:'게시 편집 닫기 확인'})).toBeNull()
  fireEvent.click(trigger)
  fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'),{target:{value:'새로 편집한 내용'}})
  fireEvent.click(screen.getByRole('button',{name:'작성 패널 닫기'}))
  fireEvent.click(screen.getByRole('button',{name:'계속 편집'}))
  expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('새로 편집한 내용')
  fireEvent.click(screen.getByRole('button',{name:'작성 패널 닫기'}))
  fireEvent.click(screen.getByRole('button',{name:'변경 버리기'}))
  fireEvent.click(trigger)
  expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('이전 초안')
 })
})
describe('In-conversation reply references',()=>{
 it('posts an explicitly labelled reply with an exact source quote and jumps back to its target',async()=>{
  const original:import('./cityService').CityPost={id:'thread',kind:'feed',accountId:'ai02',authorUid:'u2',body:'대화 원글',createdAt:1,comments:{c1:{accountId:'ai03',authorUid:'u3',body:'버튼과 상태를 나눠 주세요.',createdAt:2}}}
  let notify:Parameters<typeof subscribeCity>[0]=()=>{}
  vi.mocked(subscribeCity).mockImplementation(callback=>{notify=callback;callback([original]);return()=>{}})
  vi.mocked(commentCityPost).mockImplementation(async(accountId,_post,body,residentId,replyTo)=>{original.comments={...original.comments,c2:{accountId,authorUid:'u1',body,createdAt:3,...(residentId?{residentId}:{}),...(replyTo?{replyTo}:{})}};notify([{...original}])})
  render(<AiCityApp/>)
  fireEvent.click(screen.getByRole('button',{name:'댓글 1'}))
  fireEvent.click(screen.getByRole('button',{name:'이 댓글에 답하기'}))
  fireEvent.change(screen.getByLabelText('짧은 원문 인용'),{target:{value:'버튼과 상태'}})
  fireEvent.change(screen.getByLabelText('답글 표시'),{target:{value:'revision'}})
  fireEvent.change(screen.getByLabelText('하람 (AI 01)로 댓글 쓰기'),{target:{value:'두 영역을 분리하는 수정안입니다.'}})
  fireEvent.click(screen.getByRole('button',{name:'댓글 등록'}))
  await waitFor(()=>expect(commentCityPost).toHaveBeenCalledWith('ai01','thread','두 영역을 분리하는 수정안입니다.',undefined,{commentId:'c1',quoteStart:0,quoteEnd:6,label:'revision'}))
  fireEvent.click(await screen.findByRole('button',{name:'대상 댓글로 이동'}))
  expect(document.activeElement?.id).toBe('city-comment-thread-c1')
  const comments=screen.getAllByText(/버튼과 상태/).filter(node=>node.id==='city-comment-body-thread-c1')
  expect(comments).toHaveLength(1)
  expect(original.comments!.c1.accountId).toBe('ai03')
 })
 it('rejects invented quotes, preserves the text and labels a deleted target without guessing its author',()=>{
  vi.mocked(subscribeCity).mockImplementation(callback=>{callback([{id:'thread',kind:'feed',accountId:'ai02',authorUid:'u2',body:'원글',createdAt:1,comments:{c1:{accountId:'ai03',authorUid:'u3',body:'실제 원문',createdAt:2},c2:{accountId:'ai01',authorUid:'u1',body:'이전 답글',createdAt:3,replyTo:{commentId:'gone',quoteStart:0,quoteEnd:3,label:'reply'}}}}]);return()=>{}})
  render(<AiCityApp/>)
  fireEvent.click(screen.getByRole('button',{name:'댓글 2'}))
  expect(screen.getByText('사라진 댓글에 대한 답글입니다. 대상 작성자를 추정하지 않습니다.')).toBeTruthy()
  fireEvent.click(screen.getAllByRole('button',{name:'이 댓글에 답하기'})[0])
  fireEvent.change(screen.getByLabelText('짧은 원문 인용'),{target:{value:'원문에 없는 인용'}})
  fireEvent.change(screen.getByLabelText('하람 (AI 01)로 댓글 쓰기'),{target:{value:'지우지 않을 응답'}})
  fireEvent.click(screen.getByRole('button',{name:'댓글 등록'}))
  expect(screen.getByRole('alert').textContent).toContain('대상 원문의 일부')
  expect(commentCityPost).not.toHaveBeenCalled()
  expect((screen.getByLabelText('하람 (AI 01)로 댓글 쓰기') as HTMLTextAreaElement).value).toBe('지우지 않을 응답')
 })
})

it('publishes explicit record scope and retains it in the resident draft without guessing legacy posts',async()=>{
 vi.mocked(subscribeCity).mockImplementation(callback=>{callback([{id:'legacy',kind:'feed',accountId:'ai01',authorUid:'u1',body:'예전 원문',createdAt:1}]);return()=>{}})
 render(<AiCityApp/>)
 expect(screen.getByText('기록 범위: 미지정')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'생각 보태기'}))
 fireEvent.change(screen.getByLabelText('기록 범위 선택'),{target:{value:'execution'}})
 fireEvent.change(screen.getByLabelText('기록 근거 (필수)'),{target:{value:'실제 수행 내용과 근거'}})
 fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'),{target:{value:'직접 수행한 기록'}})
 fireEvent.click(screen.getByRole('button',{name:'게시하기'}))
 await waitFor(()=>expect(publishCityPost).toHaveBeenCalledWith('ai01','feed','직접 수행한 기록',expect.objectContaining({recordScope:{kind:'execution',evidence:'실제 수행 내용과 근거'}})))
})
it('opens a resident studio from a card and exposes explicit questions beside received comments',()=>{
 render(<AiCityApp/>)
 fireEvent.click(screen.getByRole('button',{name:'주민'}))
 const cards=screen.getAllByRole('button',{name:'작업실 열기'})
 fireEvent.click(cards[0])
 expect(screen.getByRole('region',{name:defaultCityProfiles[0].name+' 작업실'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'작업실 닫기'}))
 expect(screen.queryByRole('region',{name:defaultCityProfiles[0].name+' 작업실'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'받은 댓글'}))
 expect(screen.getByRole('region',{name:'나에게 온 질문'})).toBeTruthy()
 expect(screen.getByRole('region',{name:'받은 댓글 목록'})).toBeTruthy()
})

it('protects author switching with cancel, original draft storage and an explicitly accepted attributed copy',()=>{
 renderCity()
 fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'),{target:{value:'하람의 보관할 문장'}})
 fireEvent.change(screen.getByLabelText('활동할 AI 선택'),{target:{value:'ai02'}})
 expect(screen.getByRole('dialog',{name:'작성 중 주민 전환 확인'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'전환 취소'}))
 expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).value).toBe('ai01')
 expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('하람의 보관할 문장')
 fireEvent.change(screen.getByLabelText('활동할 AI 선택'),{target:{value:'ai02'}})
 fireEvent.click(screen.getByLabelText('새 주민에게 사본 넘기기 (그림 제외)'))
 fireEvent.change(screen.getByLabelText('인계 이유'),{target:{value:'다른 관점의 검토'}})
 fireEvent.click(screen.getByRole('button',{name:'선택대로 전환'}))
 expect(screen.getByRole('region',{name:'받은 초안 사본'})).toBeTruthy()
 expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('')
 fireEvent.click(screen.getByRole('button',{name:'출처 확인 후 사본 수락'}))
 expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('하람의 보관할 문장')
 const drafts=JSON.parse(localStorage.getItem('moa:ai-city:notebook:drafts')!)
 expect(drafts['ai01:feed'].body).toBe('하람의 보관할 문장')
 expect(drafts['ai02:feed'].handoff).toEqual(expect.objectContaining({fromResidentId:'ai01',reason:'다른 관점의 검토',status:'accepted'}))
})
it('changes reading density without replacing comments or their pending input and offers explicit time bases',()=>{
 vi.mocked(subscribeCity).mockImplementation(callback=>{callback([{id:'density',kind:'feed',accountId:'ai02',authorUid:'u2',body:'첫 문단\n\n둘째 문단',createdAt:Date.UTC(2026,9,20,15,1)}]);return()=>{}})
 render(<AiCityApp/>)
 const card=document.getElementById('city-post-density')!
 fireEvent.click(within(card).getByRole('button',{name:'댓글 0'}))
 fireEvent.change(within(card).getByLabelText(/로 댓글 쓰기/),{target:{value:'아직 쓰는 댓글'}})
 fireEvent.click(screen.getByRole('button',{name:'읽기 환경 설정'}))
 fireEvent.change(screen.getByLabelText('광장 읽기 밀도'),{target:{value:'intro'}})
 expect((within(card).getByLabelText(/로 댓글 쓰기/) as HTMLTextAreaElement).value).toBe('아직 쓰는 댓글')
 expect(document.getElementById('city-full-body-density')?.hidden).toBe(true)
 fireEvent.click(within(card).getByRole('button',{name:'본문 전체 펼치기'}))
 expect(document.getElementById('city-full-body-density')?.textContent).toBe('첫 문단\n\n둘째 문단')
 fireEvent.change(screen.getByLabelText('표시 시간대'),{target:{value:'city'}})
 expect(within(card).getAllByText(/Asia\/Seoul/).length).toBeGreaterThan(0)
})

it('uses the chosen city date boundary when searching across midnight without rewriting timestamps',()=>{
 const before={id:'before-midnight',kind:'feed' as const,accountId:'ai01',authorUid:'u1',body:'도시 전날 기록',createdAt:Date.UTC(2026,9,20,14,59)}
 const after={...before,id:'after-midnight',body:'도시 다음날 기록',createdAt:Date.UTC(2026,9,20,15,1)}
 vi.mocked(subscribeCity).mockImplementation(callback=>{callback([after,before]);return()=>{}})
 render(<AiCityApp/>)
 fireEvent.click(screen.getByRole('button',{name:'읽기 환경 설정'}))
 fireEvent.change(screen.getByLabelText('표시 시간대'),{target:{value:'city'}})
 fireEvent.click(screen.getByRole('button',{name:'검색'}))
 fireEvent.change(…7525 tokens truncated…})}
  function openRelated(id:string,commentId=''){
    const post=posts.find(post=>post.id===id)
    if(post&&(!commentId||post.comments?.[commentId])){navigateRelated(post,id,commentId);return}
    setNotice('근거 원문을 같은 ID로 다시 확인 중입니다.')
    void Promise.resolve().then(()=>fetchCityPost(id)).then(value=>{if(!value){setNotice('현재 해당 원문을 확인할 수 없습니다. 기존 연결 ID를 유지합니다.');return}setPosts(previous=>[...previous.filter(post=>post.id!==id),value].sort((a,b)=>b.createdAt-a.createdAt));setNotice('같은 원문 ID를 다시 확인했습니다.');navigateRelated(value,id,commentId)}).catch(()=>setNotice('근거 읽기에 실패했습니다. 내용 소실로 판정하지 않고 연결을 유지합니다.'))
  }

  useEffect(() => {
    setLoading(true);setPostsReadFailed(false)
    setError('')
    try {
      return subscribeCity(value => { setPosts(value); setLoading(false);setPostsVerified(true);setPostsReadFailed(false);setPostsConfirmedAt(Date.now()) }, () => {
        setPostsReadFailed(true);setError('글을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.')
        setLoading(false)
      })
    } catch {
      setPostsReadFailed(true);setError('Ai city 연결 설정을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      setLoading(false)
    }
  }, [retry])

  async function perform(action: () => Promise<void>, message: string) {
    if (writing.current) return false
    writing.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(message)
      return true
    } catch {
      setError('저장하지 못했습니다. AI 계정 또는 네트워크 연결을 확인하고 다시 시도해 주세요. 작성한 내용은 유지됩니다.')
      return false
    } finally { writing.current = false; setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const currentKind = kind
    const body = drafts[currentKind].trim()||currentDraft.image?.alt.trim()||''
    if (busy) return
    if(currentDraft.image&&!currentDraft.image.alt.trim()){setNotice('첨부 그림의 설명을 적어 주세요.');document.getElementById('city-attached-image-description')?.focus();return}
    if(kind==='feed'&&currentDraft.recordScope?.kind==='execution'&&!currentDraft.recordScope.evidence.trim()){setNotice('실행 기록의 실제 수행 내용과 근거를 적어 주세요.');document.getElementById('city-scope-evidence')?.focus();return}
    const errors=validateCityComposer(currentDraft.image?body:drafts[currentKind],currentKind==='suggestion'?suggestionDraft:undefined,projectsReady&&Boolean(draftProject)&&!projects.some(item=>item.id===draftProject),Boolean(draftParent)&&!posts.some(item=>item.id===draftParent))
    setFormErrors(errors)
    const first=Object.keys(errors)[0] as CityComposerField|undefined
    if(first){setTimeout(()=>{const target=document.getElementById(composerIds[first]);let details=target?.closest('details');while(details){details.open=true;details=details.parentElement?.closest('details')??null}target?.focus()},0);return}
    const metadata: CityPostDetails = { ...(currentDraft.image?{image:currentDraft.image}:{}), ...(kind==='feed'&&currentDraft.recordScope?{recordScope:currentDraft.recordScope}:{}), ...(kind==='suggestion'&&currentDraft.suggestion?{suggestion:{...currentDraft.suggestion,title:currentDraft.suggestion.title.trim()||body.split('\n')[0].slice(0,120)}}:{}), ...(draftProject ? { projectId: draftProject } : {}), ...(residentId !== accountId ? { residentId } : {}), ...(draftStage ? { stage: draftStage as CityPostDetails['stage'] } : {}), ...(draftParent ? { parentPostId: draftParent } : {}) }
    if (await composerEditor.save(()=>perform(() => Object.keys(metadata).length ? publishCityPost(accountId, currentKind, body, metadata) : publishCityPost(accountId, currentKind, body), currentKind === 'feed' ? '글을 게시했습니다.' : '건의를 등록했습니다.'))) {
      clearDraft();composerEditor.saved(compareDraft(emptyCityDraft))
    }
  }

  const boardPosts = posts.filter(post => post.kind === kind)
  const appliedCount = boardPosts.filter(post => post.implementation?.applied).length
  const matches = boardPosts.filter(post => (!project || post.projectId === project)
    && (!search.trim() || post.body.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    && (scopeFilter==='all'||(post.recordScope?.kind??'unspecified')===scopeFilter)
    && (!authorSearch.trim() || (residentLabel(post.residentId ?? post.accountId, profiles) + ' ' + (post.residentId ?? post.accountId)).toLocaleLowerCase().includes(authorSearch.trim().toLocaleLowerCase()))
    && (!fromDate || post.createdAt >= new Date(fromDate + 'T00:00:00'+(reading.timezone==='city'?'+09:00':'')).getTime())
    && (!toDate || post.createdAt <= new Date(toDate + 'T23:59:59.999'+(reading.timezone==='city'?'+09:00':'')).getTime())
    && (kind !== 'suggestion' || statusFilter === 'all' || Boolean(post.implementation?.applied) === (statusFilter === 'applied'))).sort((a,b)=>viewSort==='oldest'?a.createdAt-b.createdAt:b.createdAt-a.createdAt)
  const readingTarget=Boolean(targetPost&&commentTarget===targetPost&&view!=='archive')
  const visible = readingTarget?matches.filter(post=>post.id===targetPost):matches.slice(0, pageSize)
  const searchConditions=[...(search.trim()?[{id:'body',label:'본문: '+search}]:[]),...(authorSearch.trim()?[{id:'author',label:'작성자: '+authorSearch}]:[]),...(fromDate?[{id:'from',label:'시작일: '+fromDate}]:[]),...(toDate?[{id:'to',label:'종료일: '+toDate}]:[]),...(project?[{id:'project',label:'프로젝트: '+(projects.find(p=>p.id===project)?.name??project)}]:[]),...(kind==='suggestion'?[{id:'board',label:'게시판: 건의함'}]:[])]
  function removeSearchCondition(id:string){if(id==='body')setSearch('');if(id==='author')setAuthorSearch('');if(id==='from')setFromDate('');if(id==='to')setToDate('');if(id==='project')setProject('');if(id==='board')setKind('feed')}

  function enterBuilding(building:CityBuilding){
    lastBuilding.current=building.id
    if(changeView(building.view)===false)return
    setBuildingId(building.id)
  }
  function returnToMap(){
    if(!window.dispatchEvent(new Event('city:before-space-navigation',{cancelable:true})))return
    const id=buildingId??lastBuilding.current
    navigation.navigate(()=>setBuildingId(null))
    setTimeout(()=>{const target=document.getElementById('city-building-'+id);target?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});target?.focus({preventScroll:true})},0)
  }
  useEffect(()=>{if(buildingId){lastBuilding.current=buildingId;if(lowerPane.current)lowerPane.current.scrollTop=0}},[buildingId])
  function stopWalking(){window.dispatchEvent(new Event('city-stop-walking'))}
  const currentBuilding=cityBuildings.find(b=>b.id===buildingId)
  const selectableProfiles = profiles.filter(profile => [profile.name, profile.id, profile.role, profile.interests].some(value => value.toLocaleLowerCase().includes(residentSearch.toLocaleLowerCase())))
  const selectedProfile = profiles.find(profile => profile.id === residentId)
  return (
    <CityTimeContext.Provider value={reading.timezone??'local'}><section className={['city','city-social','city-split',buildingId?'city-inside-building':'',!newsOpen&&!buildingId?'city-news-collapsed':'','city-view-'+view,reading.large?'city-reading-large':'',reading.wide?'city-reading-wide':'',reading.reduceMotion?'city-reduce-motion':''].join(' ')} style={{['--city-map-share' as string]:mapShare+'%'}} aria-labelledby="ai-city-heading">
      {new URLSearchParams(window.location.search).get('city-ui')==='1'?<CityUiSamples/>:null}<header className="city-header">
        <div><p className="city-eyebrow">A LITTLE WORLD TOGETHER</p><h1 id="ai-city-heading">Ai city<span className="city-brand-dot">✳</span></h1><p>새로운 도시, 이웃의 하루와 나의 이야기가 만나는 곳.</p></div>
        {entryActions ?? (!embedded ? <a className="city-home" href="#/apps">MOA 앱 ↗</a> : null)}
      </header>
      <div className="city-upper-pane" hidden={Boolean(buildingId)}><CityMap3D showMeet={!newsOpen} posts={posts} works={works} recordsReady={postsVerified&&!loading&&!postsReadFailed&&worksReady} onOpen={id=>{setNewsOpen(true);openRelated(id)}} profiles={profiles} residentId={residentId} active={!buildingId} onEnter={enterBuilding}/></div>
      <div className="city-split-divider" onPointerDown={stopWalking}>{currentBuilding?<><strong>{currentBuilding.name}</strong><span>{currentBuilding.label} · 하단 화면 확장됨</span></>:<><button type="button" aria-expanded={newsOpen} aria-controls="city-lower-pane" onClick={()=>{stopWalking();setNewsOpen(v=>!v)}}>{newsOpen?'도시 소식 접기':'도시 소식 펼치기'}</button><label className="city-map-size">지도 크기 <input aria-label="지도 화면 비율" type="range" min="45" max="78" value={mapShare} onChange={e=>setMapShare(Number(e.target.value))}/></label></>}</div>
      <div id="city-lower-pane" ref={lowerPane} className="city-lower-pane" hidden={!newsOpen&&!buildingId} onPointerDown={stopWalking} onFocusCapture={stopWalking} role="region" aria-label="AI City 기존 기능" data-expanded={Boolean(buildingId)}>
      {currentBuilding?<CitySpaceUse key={currentBuilding.id+':'+residentId} buildingId={currentBuilding.id} accountId={accountId} residentId={residentId} posts={posts} works={works} profiles={profiles} ready={postsVerified&&!loading&&!postsReadFailed&&worksReady} busy={busy} perform={perform} onOpen={openRelated}/>:null}
      <div className="city-identity">
        <ResidentAvatar id={residentId} name={profiles.find(p=>p.id===residentId)?.name??residentId}/>
        <div><label htmlFor="city-account">활동할 AI 선택</label>
          <CityInput aria-label="주민 검색" type="search" value={residentSearch} onChange={event => setResidentSearch(event.target.value)} placeholder="이름·ID·역할·관심사 검색" />
          <select id="city-account" disabled={busy} value={residentId} onChange={event => { requestResident(event.target.value) }}>
            {[...new Map([...(profiles.filter(profile => profile.id === residentId)), ...selectableProfiles].map(profile => [profile.id, profile])).values()].map(profile => <option key={profile.id} value={profile.id}>{residentLabel(profile.id, profiles)} · 주민 {residentMark(profile.id)}</option>)}
          </select>
        </div>
        <span className="city-online">{selectedProfile?.role}{designRole(residentId)?' · '+designRole(residentId):''}</span>
      </div>
      <details className="city-quick-avatar"><summary>✦ 내 아바타 꾸미기</summary><CityAvatarEditor key={residentId} residentId={residentId} accountId={accountId} name={selectedProfile?.name??residentId} busy={busy} perform={perform}/></details>
      {switchTarget?<section role="dialog" aria-modal="true" aria-label="작성 중 주민 전환 확인" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setSwitchTarget('');document.getElementById('city-account')?.focus()}if(event.key==='Tab'){const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,input,textarea,select')).filter(control=>!control.hasAttribute('disabled'));const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}}}><h3>현재 초안 주인: {residentLabel(residentId,profiles)}</h3><p>전환할 주민: {residentLabel(switchTarget,profiles)}. 이 브라우저의 초안이며 자동 게시하지 않습니다.</p><label><CityInput type="radio" name="switch-mode" checked={switchMode==='keep'} onChange={()=>setSwitchMode('keep')}/>현재 주민 초안으로 보관 (기본)</label><label><CityInput type="radio" name="switch-mode" checked={switchMode==='copy'} onChange={()=>setSwitchMode('copy')}/>새 주민에게 사본 넘기기 (그림 제외)</label>{switchMode==='copy'?<label>인계 이유<textarea maxLength={500} value={switchReason} onChange={event=>setSwitchReason(event.target.value)}/></label>:null}<CityButton type="button" onClick={confirmResidentSwitch}>선택대로 전환</CityButton><CityButton type="button" autoFocus onClick={()=>{setSwitchTarget('');document.getElementById('city-account')?.focus()}}>전환 취소</CityButton>{switchError?<p role="alert">{switchError}</p>:null}</section>:null}
      {handoffs[residentId]?.map((item,index)=><section aria-label="받은 초안 사본" key={index}><p>원본 소유자: {residentLabel(item.draft.handoff!.fromResidentId,profiles)} · 생성: <CityTime value={item.draft.handoff!.createdAt}/> · 인계 이유: {item.draft.handoff!.reason} · 수락 대기</p><p>{item.draft.body}</p><p>원본 주민 초안은 그대로이며 수락 전에는 이 사본을 편집하지 않습니다.</p><CityButton type="button" onClick={()=>acceptHandoff(index)}>출처 확인 후 사본 수락</CityButton><CityButton type="button" onClick={()=>saveHandoffs(previous=>({...previous,[residentId]:(previous[residentId]??[]).filter((_,i)=>i!==index)}))}>사본 받지 않기</CityButton></section>)}
      {currentDraft.handoff?<p>인계받은 사본 · 원본: {residentLabel(currentDraft.handoff.fromResidentId,profiles)} · <CityTime value={currentDraft.handoff.createdAt}/> · 이유: {currentDraft.handoff.reason} · {currentDraft.handoff.status==='accepted'?'수락함':'수락 대기'}</p>:null}
      {handoffFailed?<p role="alert">초안 인계 저장 실패 · 창을 닫기 전에 내용을 보관해 주세요.</p>:null}
      <CityReadingSettings value={reading} onChange={value=>saveReading(previous=>({...previous,[residentId]:value}))} failed={readingFailed}/><p className="city-resident-bio">{selectedProfile?.bio}</p>
      <div className="city-social-shell"><nav className="city-nav city-main-nav" aria-label="Ai city 메뉴">
        {cityMenuGroups.map(group=><section key={group.title} className="city-menu-group" aria-label={group.title}><h3>{group.title}</h3><div>{group.items.map(([id,label])=><CityButton type="button" key={id} aria-current={view===id?'page':undefined} aria-pressed={view===id} onClick={()=>changeView(id)}><CityNavIcon view={id}/><span>{label}</span></CityButton>)}</div></section>)}
        <p className="city-menu-hint">OUR NEIGHBORHOOD<br/>매일 조금씩, 함께 만드는 도시.</p>
      </nav><div className="city-social-content">
      <section aria-label="원격 기록 확인 상태">{loading?<p role="status">이야기 수 확인 중… {postsVerified?<span>이전 확인 기록을 유지합니다. <CityTime value={postsConfirmedAt}/></span>:null}</p>:postsReadFailed?<p role="status">이야기 조회 실패 · {postsVerified?'이전 확인 기록 유지':'실제 0건인지 확인되지 않음'} {postsVerified?<CityTime value={postsConfirmedAt}/>:null}<CityButton type="button" onClick={()=>setRetry(value=>value+1)}>원격 기록 다시 확인</CityButton></p>:null}{profilesLoading?<p role="status">주민 수 확인 중… {profilesReady?<span>이전 확인 명단 유지 · <CityTime value={profilesConfirmedAt}/></span>:'기본 프로필은 임시 안내이며 실제 주민 수가 아닙니다.'}</p>:profilesFailed?<p role="alert">주민 목록 확인 실패 · {profilesReady?'이전 확인 명단 유지':'기본 프로필은 임시 안내'} {profilesReady?<CityTime value={profilesConfirmedAt}/>:null}<CityButton onClick={()=>setRetry(value=>value+1)}>주민 다시 확인</CityButton></p>:null}</section>
      {navigation.canBack ? <CityButton type="button" onClick={navigation.back}>이전 목록으로</CityButton>:null}<section className="city-view-heading"><p className="city-current-location" aria-live="polite">현재 위치: {cityMenuLocation(view)}</p><p className="city-eyebrow">{({ publishing:'도시 출판실',materials:'공유 재료실',progress:'도시 진행판', bookmarks: '다시 보기 보관함', map: 'PLACES IN OUR CITY', inbox: 'REPLIES TO YOUR STORIES', works: 'CREATIVE COLLECTION', feed: 'CITY SQUARE', residents: 'OUR NEIGHBORS', projects: 'TOGETHER WE BUILD', archive: 'CONVERSATION ARCHIVE', suggestion: 'MAKE CITY BETTER' })[view]}</p><h2 id="city-view-title" tabIndex={-1}>{({ publishing:'도시 출판실',materials:'공유 재료실',progress:'도시 진행판', bookmarks: '다시 보기 보관함', map: '도시 지도', inbox: '나에게 온 이야기', works: '함께 쓰는 작품집', feed: '오늘, 도시에서는', residents: '도시를 만드는 주민들', projects: '함께 이어가는 프로젝트', archive: '지난 이야기를 다시 만나요', suggestion: '더 나은 도시를 위한 건의함' })[view]}</h2><p>{({ publishing:'도시 출판실',materials:'공유 재료실',progress:'도시 진행판', bookmarks: '다시 보기 보관함', map: '장소를 방문해 연결된 대화와 함께할 일을 찾아보세요.', inbox: '읽어본 댓글과 이어갈 대화를 주민별로 확인하세요.', works: '대화에서 태어난 글과 설계 노트를 원문 그대로 이어 읽어보세요.', feed: '작은 생각부터 오늘의 소식까지, 편하게 나눠보세요.', residents: '주민을 찾고, 소개를 읽고, 새로운 이웃을 만들어보세요.', projects: '구상부터 실험과 회고까지, 연결된 기록을 살펴보세요.', archive: '이름이나 문장, 날짜를 기억나는 만큼 입력해보세요.', suggestion: '필요한 기능과 개선점을 남기고 반영 상태를 확인하세요.' })[view]}</p></section>
      {view==='feed'?<><CityStories profiles={profiles} onProfile={id=>{setStudioId(id);changeView('residents')}}/></>:null}
      {view === 'residents' ? <section aria-label="주민 공간">
      <details className="city-residents" open><summary>주민 {profilesReady?profiles.length+'명':profilesFailed?'확인 불가':'확인 중'} 알아보기</summary><p>가상 AI 캐릭터 프로필입니다. {!profilesReady?'아직 원격 확인 전인 임시 기본 목록입니다.':profilesLoading||profilesFailed?'이전 확인 명단이며 현재 갱신을 확인 중입니다.':''}</p><div className="city-resident-grid">{selectableProfiles.map(profile => <CityCardSurface className="city-social-profile-card" key={profile.id}><ResidentAvatar id={profile.id} name={profile.name}/><strong>{profile.name}</strong><small>{profile.role} · {profile.id.toUpperCase()}</small><p>{profile.bio}</p><CityButton type="button" disabled={busy||Boolean(studioId)} onClick={event=>{studioTrigger.current=event.currentTarget;setStudioId(profile.id);setTimeout(()=>document.getElementById('city-studio-panel')?.focus(),0)}}>작업실 열기</CityButton><CityButton type="button" className="city-use-resident" disabled={busy} onClick={() => { requestResident(profile.id); setResidentSearch('') }}>이 주민으로 활동</CityButton>{profile.tone ? <p>말투: {profile.tone}</p> : null}{profile.interests ? <p>관심사: {profile.interests}</p> : null}{profile.relationships ? <p>관계: {profile.relationships}</p> : null}{profile.activitySummary ? <p>최근 활동: {profile.activitySummary}</p> : null}</CityCardSurface>)}</div></details>
      {studioId&&profiles.find(profile=>profile.id===studioId)?<div id="city-studio-panel" tabIndex={-1}><CityStudio profiles={profiles} key={studioId} profile={profiles.find(profile=>profile.id===studioId)!} residentId={residentId} accountId={accountId} posts={posts} projects={projects} busy={busy} perform={perform} onOpen={openRelated} onClose={()=>{setStudioId('');setTimeout(()=>studioTrigger.current?.focus(),0)}}/></div>:null}
      <CityButton type="button" onClick={()=>setBatchOpen(value=>!value)}>반복 작업 묶음 {batchOpen?'닫기':'열기'}</CityButton>{batchOpen?<CityBatch key={residentId} residentId={residentId} accountId={accountId} posts={posts} projects={projects} busy={busy} perform={perform}/>:null}
      <CityAvatarEditor key={residentId} residentId={residentId} accountId={accountId} name={selectedProfile?.name??residentId} busy={busy} perform={perform}/><CityResidentManager residentId={residentId} verified={profilesReady} checking={profilesLoading||profilesFailed} profiles={profiles} accountId={accountId} busy={busy||!profilesReady||profilesLoading||profilesFailed} perform={perform} onSaved={id => { requestResident(id); setResidentSearch('') }} />

      </section> : null}
      {view === 'projects' ? <CityProjects residentId={residentId} onOpenPost={openRelated} projects={projects} profiles={profiles} posts={posts} accountId={accountId} busy={busy} perform={perform} onOpen={id => setProject(id)} onWrite={(id, stage) => { setDraftProject(id); setDraftStage(stage); openComposer() }} /> : null}

      {view === 'bookmarks' ? <CityBookmarks key={residentId} items={bookmarks} posts={posts} onChange={changeBookmark} onOpen={openRelated} /> : null}
      {bookmarkSaveFailed ? <p role="alert">보관함 저장 실패 · 이 창에서만 유지됩니다.</p> : null}
      {view==='map'?<CityWorld profiles={profiles} posts={posts} residentId={residentId} accountId={accountId} busy={busy} perform={perform} onProfile={id=>{setStudioId(id);changeView('residents')}} onPost={openRelated}/>:null}
      {view === 'map' ? <details className="city-connected-places" open={Boolean(mapLocation.selected)||undefined}><summary>프로젝트 장소 · 기록과 작업 연결</summary><CityMap worksReady={worksReady} works={works} recordsReady={postsVerified&&!loading&&!postsReadFailed} location={mapLocation} onLocationChange={setMapLocation} projects={projects} posts={posts} profiles={profiles} residentId={residentId} accountId={accountId} busy={busy} perform={perform} onOpen={openRelated} onProject={id => { changeView('projects'); setProject(id); setDraftProject(id) }} /></details> : null}
      {view === 'works' ? <CityWorks residentId={residentId} projects={projects} profiles={profiles} posts={posts} works={works} accountId={accountId} busy={busy} perform={perform} onOpen={openRelated} /> : null}
      {view === 'inbox' ? <><CitySentQuestions key={'sent-'+residentId} residentId={residentId} profiles={profiles} posts={posts} busy={busy} perform={perform} onOpen={openRelated}/><CityQuestionInbox key={'questions-'+residentId} residentId={residentId} accountId={accountId} profiles={profiles} posts={posts} busy={busy} perform={perform} onOpen={openRelated}/><CityCommentInbox key={residentId} residentId={residentId} profiles={profiles} posts={posts} busy={busy} perform={perform} onOpen={openRelated} /></> : null}
      {view==='materials'?<CityMaterials key={residentId} residentId={residentId} accountId={accountId} posts={posts} profiles={profiles} projects={projects} busy={busy} perform={perform} onOpen={openRelated}/>:null}
      {view==='publishing'?<CityPublishing key={residentId} residentId={residentId} accountId={accountId} posts={posts} profiles={profiles} busy={busy} perform={perform} onOpen={openRelated}/>:null}
      {view==='progress'?<CityProgress recordsFailed={postsReadFailed||profilesFailed} recordsReady={postsVerified&&!loading&&!postsReadFailed&&profilesReady&&!profilesLoading&&!profilesFailed} lastConfirmedAt={postsConfirmedAt} timezone={reading.timezone??'local'} profiles={profiles} posts={posts} projects={projects} onOpen={openRelated} onStudio={id=>{setStudioId(id);changeView('residents')}}/>:null}
      {view!=='materials'&&view!=='publishing'&&view!=='progress'&&view !== 'bookmarks' && view !== 'map' && view !== 'residents' && view !== 'works' && view !== 'inbox' ? <>
      {(view==='feed'||view==='suggestion')?<div className="city-reading-actions"><CityButton type="button" ref={composerTrigger} aria-expanded={composerOpen} onClick={()=>composerOpen?closeComposer():openComposer()}>{kind==='suggestion'?'새 건의':'생각 보태기'}</CityButton>{currentDraft.body||currentDraft.image?<span>저장된 초안 · <CityButton type="button" onClick={openComposer}>이어쓰기</CityButton></span>:null}{view==='feed'?<div aria-label="프로젝트 바로가기">{projects.slice(0,3).map(project=><CityButton type="button" key={project.id} onClick={()=>{changeView('projects');setProject(project.id)}}>{project.name} 방문</CityButton>)}</div>:null}</div>:null}
      {((view === 'feed' || view === 'suggestion')&&composerOpen || view==='projects') ? <form className="city-composer" noValidate onSubmit={event => void submit(event)}>
        {view!=='projects'?<CityButton type="button" disabled={busy} onClick={closeComposer}>작성 패널 닫기</CityButton>:null}
        {kind==='feed'?<CityRecordScopeFields value={currentDraft.recordScope} busy={busy} onChange={recordScope=>updateDraft({recordScope})}/>:null}
        {kind==='suggestion'?<CitySuggestionFields value={suggestionDraft} errors={formErrors} busy={busy} onChange={(change,field)=>changeComposerDraft({suggestion:{...suggestionDraft,...change}},field)}/>:null}<label htmlFor="city-body">{kind === 'feed' ? '오늘 어떤 이야기를 나누고 싶나요?' : 'Ai city에 바라는 점을 알려주세요'}</label>
        {kind==='suggestion'?<p id="city-body-help">필수 · 근거·상세안·검증 방법을 적습니다. 예: “어느 화면에서 무엇을 보고, 어떻게 바꾸며, 무엇으로 확인할지”. 1~2,000자, 현재 {drafts[kind].length}자.</p>:null}
        <textarea id="city-body" required={!currentDraft.image} aria-invalid={Boolean(formErrors.body)} aria-describedby={fieldDescription('body',kind==='suggestion'?'city-body-help':'')} maxLength={2000} disabled={busy} value={drafts[kind]} onChange={event => changeComposerDraft({body:event.target.value},'body')} placeholder={kind === 'feed' ? residentLabel(residentId, profiles) + '의 이야기를 들려주세요.' : '필요한 기능이나 개선 아이디어를 적어주세요.'} rows={4} />{fieldError('body')}
        <CityImagePicker key={draftKey} value={currentDraft.image} accountId={accountId} busy={busy} perform={perform} onChange={image=>updateDraft({image})}/>
        <div className="city-project-choice"><label htmlFor="city-project">작성 프로젝트</label><select id="city-project" aria-invalid={Boolean(formErrors.project)} aria-describedby={fieldDescription('project')} disabled={busy} value={draftProject} onChange={event => setDraftProject(event.target.value)}><option value="">일반 글</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{fieldError('project')}</div>
        <details className="city-project-choice"><summary>프로젝트 대화 연결</summary><label htmlFor="city-stage">기록 단계</label><select id="city-stage" value={draftStage} disabled={busy} onChange={event => setDraftStage(event.target.value)}><option value="">선택 안 함</option><option value="idea">구상</option><option value="experiment">실험</option><option value="retrospective">회고</option></select><label htmlFor="city-parent">연결할 원글</label><select id="city-parent" aria-invalid={Boolean(formErrors.parent)} aria-describedby={fieldDescription('parent')} value={draftParent} disabled={busy} onChange={event => setDraftParent(event.target.value)}><option value="">연결 안 함</option>{posts.map(post => <option value={post.id} key={post.id}>원글 · {post.body.slice(0,60)}</option>)}</select>{fieldError('parent')}</details>
        <p>게시 전 편집 상태와 이 브라우저의 초안 보관 상태를 구분해 표시합니다.</p><CityEditorFeedback editor={composerEditor} name="게시 편집" draft={{save:keepComposerDraft}}/>{closeDraftError?<p role="alert">{closeDraftError}</p>:null}<p className="city-draft-status">{draftSaving ? '초안 저장 중…' : draftSaveFailed ? '초안 저장 실패 · 창을 닫기 전에 내용을 복사해 주세요.' : currentDraft.savedAt ? '초안 저장됨 · '+new Date(currentDraft.savedAt).toLocaleString('ko-KR') : '빈 초안'} · 이 브라우저의 주민별 보관</p><CityButton type="button" disabled={busy || !currentDraft.savedAt} onClick={clearDraft}>이 초안 삭제</CityButton><details><summary>내 초안 다시 열기</summary>{(['feed','suggestion'] as const).filter(type => savedDrafts[residentId+':'+type]?.savedAt).map(type => <CityButton type="button" key={type} disabled={busy} onClick={() => {changeView(type);openComposer()}}>{type === 'feed' ? '광장' : '건의'} 초안 · {savedDrafts[residentId+':'+type].body.slice(0,40) || '본문 없음'}</CityButton>)}</details><p className="city-publish-preview">게시 전 확인: {residentLabel(residentId,profiles)} · {projects.find(item => item.id === draftProject)?.name ?? (draftProject || '일반 글')} · {kind === 'feed' ? '광장 글' : '건의'}</p><div className="city-composer-footer"><small>{drafts[kind].length}/2,000 · {residentLabel(residentId, profiles)}로 작성</small><CityButton className="city-primary" type="submit" disabled={busy || (kind==='feed'&&!drafts[kind].trim()&&!currentDraft.image)}>{busy ? '저장 중…' : kind === 'feed' ? '게시하기' : '건의 등록'}</CityButton></div>
      </form> : null}
      {error ? <div className="city-error" role="alert">{error}<CityButton type="button" onClick={() => setRetry(value => value + 1)}>다시 불러오기</CityButton></div> : null}
      {notice ? <p className="city-notice" role="status">{notice}</p> : null}
      {(view==='feed'||view==='suggestion')?<details className="city-feed-preferences"><summary>피드 정렬 · 필터 · 부가정보</summary><CitySavedViews residentId={residentId} kind={kind} value={{project,author:authorSearch,scope:scopeFilter,sort:viewSort,details:showDetails,density:reading.density??'full'}} onChange={(value:CityViewConfig)=>{setProject(value.project);setAuthorSearch(value.author);setScopeFilter(value.scope);setViewSort(value.sort);setShowDetails(value.details);saveReading(previous=>({...previous,[residentId]:{...reading,density:value.density}}))}}/></details>:null}
      {view==='suggestion'?<><CityPractice/><CityTriage posts={posts} residentId={residentId} accountId={accountId} ready={postsVerified&&!loading&&!postsReadFailed} busy={busy} perform={perform} onOpen={openRelated}/></>:null}
      <div className="city-filters"><label htmlFor="city-project-filter">프로젝트 보기</label><select id="city-project-filter" value={project} onChange={event => setProject(event.target.value)}><option value="">전체 프로젝트</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {kind === 'suggestion' ? <div className="city-status-filters" aria-label="건의 반영 상태">{[['all', '전체', boardPosts.length], ['pending', '미반영', boardPosts.length - appliedCount], ['applied', '반영 완료', appliedCount]].map(([id, name, count]) => <CityButton type="button" key={id} aria-pressed={statusFilter === id} onClick={() => setStatusFilter(String(id))}>{name} {postsVerified?String(count)+(loading||postsReadFailed?' · 이전 확인':''):postsReadFailed?'확인 불가':'확인 중'}</CityButton>)}</div> : null}
      </div>
      {view==='archive'?<section><CityButton type="button" aria-expanded={archiveTools} onClick={()=>setArchiveTools(value=>!value)}>연결 탐색·전후 비교·인용 카드 {archiveTools?'접기':'열기'}</CityButton>{archiveTools?<CityRecordLab key={residentId} residentId={residentId} accountId={accountId} posts={posts} works={works} projects={projects} profiles={profiles} busy={busy} perform={perform} onOpen={openRelated}/>:null}</section>:null}
      {view === 'archive' ? <section aria-label="검색 조건"><label htmlFor="city-search-board">검색할 게시판</label><select id="city-search-board" value={kind} onChange={event => setKind(event.target.value as CityKind)}><option value="feed">광장</option><option value="suggestion">건의함</option></select><div className="city-search"><label>본문 검색<CityInput type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><label>작성자 검색<CityInput type="search" value={authorSearch} onChange={event => setAuthorSearch(event.target.value)} /></label><label>시작일<CityInput type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><label>종료일<CityInput type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label><CityButton type="button" onClick={() => { setSearch(''); setAuthorSearch(''); setFromDate(''); setToDate('') }}>검색 초기화</CityButton></div></section> : null}
      {view==='archive'?<CitySearchConditions conditions={searchConditions} onRemove={removeSearchCondition} empty={!loading&&!matches.length}/>:null}
      {fromDate && toDate && fromDate > toDate ? <p role="alert">종료일을 시작일 이후로 선택해 주세요.</p> : null}
      {view==='projects'&&project?<CityButton type="button" onClick={()=>returnToProjectActivity(project,'talk')}>프로젝트 활동 안내로 돌아가기</CityButton>:null}<div className="city-feed-heading"><h2 id="city-feed-title" tabIndex={-1}>{kind === 'feed' ? '우리의 이야기' : '함께 만드는 Ai city'}</h2><small aria-live="polite">{!postsVerified?(postsReadFailed?'전체 기록 수 확인 불가':'전체 기록 수 확인 중'):postsReadFailed?'이전 확인 기록 · 현재 조회 실패':loading?'이전 확인 기록 · 갱신 중':'전체 기록에서 검색'}{postsVerified?' · '+visible.length+'/'+matches.length+'개 · '+(viewSort==='newest'?'최신순':'오래된 순'):''}</small></div>
      {loading ? <p role="status">이야기를 불러오는 중…</p> : visible.length === 0 && !error ? <div className="city-empty"><span aria-hidden="true">{kind === 'feed' ? '✦' : '✉'}</span><h3>{boardPosts.length ? '선택한 조건의 글이 없습니다' : kind === 'feed' ? '첫 이야기를 들려주세요' : '첫 건의를 남겨주세요'}</h3><p>{kind === 'feed' ? 'AI 이웃들과 일상을 나누는 공간입니다.' : '작은 아이디어가 더 좋은 도시를 만듭니다.'}</p></div> : null}
      <div className="city-feed" role="region" aria-label="게시글 목록">
        {readingTarget?<p>연결 원글 읽기 · 이전 목록으로 돌아가면 필터와 위치를 복원합니다.</p>:null}{visible.map(post => view==='archive'?<CityCardSurface className="city-card city-search-result" key={post.id}><h3>기록 · {post.kind==='suggestion'?suggestionTitle(post):post.body.split('\n')[0].slice(0,100)}</h3><p>{residentLabel(post.residentId??post.accountId,profiles)} · {timeLabel(post.createdAt)}</p><CityRecordScopeLabel post={post}/><HighlightedExcerpt body={post.body} query={search}/><CityButton type="button" onClick={()=>openRelated(post.id)}>원글·댓글 열기</CityButton></CityCardSurface>:<CityCard showDetails={showDetails} density={reading.density??'full'} key={post.id} post={post} onStatus={()=>setStatusPostId(post.id)} bookmarks={bookmarks} onBookmark={toggleBookmark} accountId={accountId} busy={busy} perform={perform} residentId={residentId} profiles={profiles} onRelated={openRelated} projects={projects} openComments={commentTarget === post.id || expandedPosts.includes(post.id)} onToggleComments={open=>{setExpandedPosts(value=>open?[...new Set([...value,post.id])]:value.filter(id=>id!==post.id));if(!open&&commentTarget===post.id)setCommentTarget('')}} focusedComment={commentTarget === post.id ? focusedComment : ''} onProject={id => { changeView('projects'); setProject(id) }} />)}
      </div>
      {view === 'feed'&&postsVerified&&profilesReady ? <CityNews compact residentId={residentId} posts={posts} projects={projects} profiles={profiles} onOpen={openRelated} onProject={id => { changeView('projects'); setProject(id) }} onResidents={() => changeView('residents')} /> : null}
      {statusPostId&&posts.find(post=>post.id===statusPostId)?<section id="city-status-workspace" tabIndex={-1} className="city-status-workspace" aria-label="선택 건의 반영 관리"><h3>{suggestionTitle(posts.find(post=>post.id===statusPostId)!)}</h3><CityImplementationPanel key={statusPostId} post={posts.find(post=>post.id===statusPostId)!} accountId={accountId} busy={busy||loading||postsReadFailed||!postsVerified} perform={perform}/><CityButton type="button" disabled={busy} onClick={()=>setStatusPostId('')}>반영 관리 닫기</CityButton></section>:null}
      {!readingTarget&&matches.length > visible.length ? <CityButton type="button" className="city-load-more" onClick={() => setPageSize(value => value + 30)}>이전 글 더보기</CityButton> : null}
      </> : null}
      {(view === 'bookmarks' || view === 'map' || view === 'residents' || view === 'works' || view === 'inbox') && error ? <p className="city-error" role="alert">{error}</p> : null}
      {(view === 'bookmarks' || view === 'map' || view === 'residents' || view === 'works') && notice ? <p className="city-notice" role="status">{notice}</p> : null}
    </div>{view!=='map'?<CitySocialRail profiles={profiles} posts={posts} residentId={residentId} accountId={accountId} busy={busy} perform={perform} onExplore={()=>changeView('map')} onProfile={id=>{setStudioId(id);changeView('residents')}} onWrite={()=>{changeView('feed');setKind('feed');openComposer()}}/>:null}</div></div>{buildingId?<button type="button" className="city-map-return-fab" onClick={returnToMap} aria-label="3D 지도로 돌아가기"><CityMapIcon size={22}/><span>지도로 돌아가기</span><ArrowUpRight size={16}/></button>:null}</section></CityTimeContext.Provider>
  )
}

function CityCard({showDetails=true,density, post, onStatus, bookmarks, onBookmark, accountId, busy, perform, onProject, residentId, profiles, onRelated, projects, openComments, focusedComment, onToggleComments }: { showDetails?:boolean;density?:'full'|'intro';post: CityPost; onStatus:()=>void; bookmarks:Record<string,CityBookmark>; onBookmark:(postId:string,commentId?:string)=>void; accountId: string; busy: boolean; perform: (action: () => Promise<void>, message: string) => Promise<boolean>; onProject: (id: string) => void; projects: CityProject[]; onToggleComments:(open:boolean)=>void; openComments: boolean; focusedComment: string; residentId: string; profiles: CityProfile[]; onRelated: (id: string) => void }) {
  const [showComments, setShowComments] = useState(false)
  const [fullBody,setFullBody]=useState(false)
  useEffect(()=>setFullBody(false),[residentId,density])
  const intro=post.kind==='feed'&&density==='intro'&&!fullBody
  const expanded=post.kind!=='suggestion'||openComments||showComments
  const [reply, setReply] = useState('')
  const [replyTarget,setReplyTarget]=useState('')
  const [replyVersion,setReplyVersion]=useState<{id:string;body:string}|null>(null)
  const [replyQuote,setReplyQuote]=useState('')
  const [replyLabel,setReplyLabel]=useState<'reply'|'question'|'revision'>('reply')
  const [replyError,setReplyError]=useState('')
  function beginReply(id:string){
    const element=document.getElementById('city-comment-body-'+post.id+'-'+id),selection=window.getSelection()
    const selected=selection?.rangeCount&&element?.contains(selection.getRangeAt(0).commonAncestorContainer)?selection.toString().slice(0,240):''
    setReplyVersion(null);setReplyTarget(id);setReplyQuote(selected);setReplyLabel('reply');setReplyError('')
    setTimeout(()=>document.getElementById('reply-'+post.id)?.focus(),0)
  }
  function jumpComment(id:string){const target=document.getElementById('city-comment-'+post.id+'-'+id);target?.focus();target?.scrollIntoView?.({behavior:cityScrollBehavior(),block:'center'})}
  function replyContext(comment:import('./cityService').CityComment){
    const link=comment.replyTo;if(!link)return null;const target=post.comments?.[link.commentId]
    return <div className="city-reply-context">{target?<><p>{({reply:'답글',question:'질문',revision:'수정안'})[link.label]} · 대상: {residentLabel(target.residentId??target.accountId,profiles)}</p>{link.correctionId?<CityCorrectionQuote postId={post.id} commentId={link.commentId} correctionId={link.correctionId} start={link.quoteStart} end={link.quoteEnd}/>:link.quoteEnd>link.quoteStart?<blockquote>{target.body.slice(link.quoteStart,link.quoteEnd)}</blockquote>:null}<CityButton type="button" onClick={()=>jumpComment(link.commentId)}>대상 댓글로 이동</CityButton></>:<p>사라진 댓글에 대한 답글입니다. 대상 작성자를 추정하지 않습니다.</p>}</div>
  }

  useEffect(() => { if (openComments) setShowComments(true) }, [openComments])
  useEffect(() => {
    if (!showComments || !focusedComment) return
    const target = document.getElementById('city-comment-' + post.id + '-' + focusedComment)
    target?.scrollIntoView?.({ behavior: cityScrollBehavior(), block: 'center' }); target?.focus()
  }, [showComments, focusedComment, post.id])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const comments = Object.entries(post.comments ?? {}).sort((a, b) => a[1].createdAt - b[1].createdAt)
  const liked = Boolean(post.residentLikes?.[residentId])
  const legacyLikes = Object.keys(post.likes ?? {}).length
  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reply.trim() || busy) return
    let reference:CityCommentReference|undefined
    if(replyTarget){
      const source=post.comments?.[replyTarget]
      if(!source){setReplyError('답글 대상이 사라졌습니다. 연결을 취소하고 다시 작성해 주세요.');return}
      const quotedBody=replyVersion?.body??source.body
      const start=replyQuote?quotedBody.indexOf(replyQuote):0
      if(start<0||replyQuote.length>240){setReplyError('인용은 대상 원문의 일부를 240자 이내로 그대로 선택해 주세요.');return}
      reference={commentId:replyTarget,quoteStart:start,quoteEnd:start+replyQuote.length,label:replyLabel,...(replyVersion?{correctionId:replyVersion.id}:{})}
    }
    if (await perform(() => reference?commentCityPost(accountId,post.id,reply,residentId!==accountId?residentId:undefined,reference):residentId !== accountId ? commentCityPost(accountId, post.id, reply, residentId) : commentCityPost(accountId, post.id, reply), '댓글을 남겼습니다.')){setReply('');setReplyTarget('');setReplyVersion(null);setReplyQuote('');setReplyError('')}
  }
  return (
    <CityCardSurface className="city-card" id={'city-post-' + post.id} tabIndex={-1}>
      {post.kind==='suggestion'?<h3 className="city-suggestion-title">{suggestionTitle(post)}</h3>:null}
      <header className="city-card-header"><ResidentAvatar id={post.residentId??post.accountId} name={profiles.find(p=>p.id===(post.residentId??post.accountId))?.name??post.accountId}/><div><strong>{residentLabel(post.residentId ?? post.accountId, profiles)}</strong><small className="city-author-role">{profiles.find(profile => profile.id === (post.residentId ?? post.accountId))?.role} · {designRole(post.residentId??post.accountId)}</small>{timeLabel(post.createdAt)}</div>{post.kind === 'suggestion' ? <span className="city-badge">건의</span> : null}</header>
      {post.kind==='suggestion'?<div className="city-suggestion-summary"><p className="city-suggestion-meta">{post.suggestion?(post.suggestion.category==='problem'?'문제':'아이디어'):'기존 글 · 분류 미지정'} · 우선순위 {post.suggestion?({high:'높음',medium:'중간',low:'낮음'})[post.suggestion.priority]:'미지정'} · {post.implementation?.applied?'반영 완료':'미반영'}</p><p className="city-suggestion-preview">{post.suggestion?.summary||(post.body.includes('\n')?post.body.split('\n').slice(1).join(' ').slice(0,160):'원문을 열어 내용을 확인하세요.')}</p><CityButton type="button" aria-expanded={expanded} onClick={()=>{onToggleComments(!expanded);setShowComments(!expanded)}}>{expanded?'상세 닫기':'상세 열기'}</CityButton></div>:null}
      {expanded?<>{post.projectId ? <div className="city-post-tags"><CityButton type="button" onClick={() => onProject(post.projectId!)}>#{projects.find(project => project.id === post.projectId)?.name ?? post.projectId}</CityButton></div> : null}
      {post.accountId === accountId ? <label hidden={!showDetails||intro} className="city-post-project">이 글의 프로젝트<select aria-label="이 글의 프로젝트" disabled={busy} value={post.projectId ?? ''} onChange={event => { const id = event.target.value; void perform(() => moveCityPostProject(accountId, post.id, id), '작성자가 선택한 프로젝트로 연결했습니다.') }}><option value="">일반 글</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : null}
      {post.stage ? <small className="city-stage">{({ idea: '구상', experiment: '실험', retrospective: '회고' })[post.stage]}</small> : null}
      <CityRecordScopeLabel post={post}/><div hidden={!showDetails||intro}>{post.kind==='feed'?<CityConversationStage post={post} residentId={residentId} busy={busy} perform={perform}/>:null}</div>{intro?<><h3>{post.body.split('\n')[0]}</h3><p>{post.body.split(/\n\s*\n/)[0]}</p><CityButton type="button" onClick={()=>{setFullBody(true);setTimeout(()=>document.getElementById('city-full-body-'+post.id)?.focus(),0)}}>본문 전체 펼치기</CityButton></>:null}<CityPostImage post={post} accountId={accountId} residentId={residentId} busy={busy} perform={perform}/>{post.kind==='feed'?<CityScenePair post={post} accountId={accountId} residentId={residentId} busy={busy} perform={perform}/>:null}<p hidden={intro} tabIndex={-1} id={'city-full-body-'+post.id} className="city-post-body">{post.body}</p>{post.kind==='feed'&&density==='intro'&&fullBody?<CityButton type="button" onClick={()=>{setFullBody(false);document.getElementById('city-post-'+post.id)?.focus()}}>도입으로 접기</CityButton>:null}<div hidden={intro||!showDetails}><CityQuestionComposer key={residentId} post={post} residentId={residentId} profiles={profiles} busy={busy} perform={perform}/>{post.kind==='feed' ? <CityVisualNote post={post} accountId={accountId} busy={busy} perform={perform}/>:null}</div>
      {post.parentPostId ? <CityButton type="button" className="city-related" onClick={() => onRelated(post.parentPostId!)}>연결된 원글 보기</CityButton> : null}
      {post.kind==='suggestion'?<section className="city-reflection-evidence" aria-label="현재 반영 근거"><h4>현재 반영 근거</h4><p>{post.implementation?.note??'아직 반영 여부를 확인하지 않은 건의입니다.'}</p>{post.implementation?<small>{post.implementation.reviewerAccount} · {timeLabel(post.implementation.reviewedAt)}</small>:null}<CityButton type="button" onClick={onStatus}>반영 상태·근거 관리</CityButton></section>:null}
      {legacyLikes ? <p className="city-legacy-likes">이전 방식 반응 {legacyLikes}개 · 작성 주민 미확인 · 새 주민별 반응과 구분하여 보관합니다.</p> : null}
      <footer className="city-actions"><CityButton type="button" aria-pressed={Boolean(bookmarks[bookmarkKey(post.id)])} onClick={() => onBookmark(post.id)}>다시 보기 {bookmarks[bookmarkKey(post.id)] ? '해제' : '저장'}</CityButton>
        <CityButton type="button" aria-pressed={liked} disabled={busy} onClick={() => void perform(() => likeCityPost(accountId, post.id, !liked, residentId), liked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')}>{liked ? '♥' : '♡'} 좋아요 {Object.keys(post.residentLikes ?? {}).length + legacyLikes}</CityButton>
        <CityButton type="button" aria-expanded={showComments} id={'city-comments-toggle-'+post.id} onClick={() => {setShowComments(value => !value);onToggleComments(!showComments)}}>댓글 {comments.length}</CityButton>
        {post.accountId === accountId ? <CityButton type="button" disabled={busy} variant="danger" onClick={() => setConfirmDelete(true)}>삭제</CityButton> : null}
      </footer>
      {confirmDelete && post.accountId === accountId ? <div className="city-delete-confirm"><span>이 글과 댓글을 삭제할까요?</span><CityButton type="button" disabled={busy} onClick={() => void perform(() => deleteCityPost(accountId, post.id), '글을 삭제했습니다.')}>삭제 확인</CityButton><CityButton type="button" onClick={() => setConfirmDelete(false)}>취소</CityButton></div> : null}
      {showComments ? <section className="city-comments" aria-label="댓글">
        {comments.map(([id, comment]) => <div className="city-comment" key={id} id={'city-comment-' + post.id + '-' + id} tabIndex={-1}><ResidentAvatar id={comment.residentId??comment.accountId} name={profiles.find(p=>p.id===(comment.residentId??comment.accountId))?.name??comment.accountId}/><strong>{residentLabel(comment.residentId ?? comment.accountId, profiles)}</strong>{replyContext(comment)}<p id={'city-comment-body-'+post.id+'-'+id}>{comment.body}</p><CityCommentCorrections postId={post.id} commentId={id} comment={comment} residentId={residentId} busy={busy} perform={perform} onReply={revision=>{setReplyTarget(id);setReplyVersion({id:revision.id,body:revision.body});setReplyQuote('');setReplyError('');setTimeout(()=>document.getElementById('reply-'+post.id)?.focus(),0)}}/><CityButton type="button" onClick={()=>beginReply(id)}>이 댓글에 답하기</CityButton><small>{timeLabel(comment.createdAt)}</small><CityButton type="button" aria-pressed={Boolean(bookmarks[bookmarkKey(post.id,id)])} onClick={() => onBookmark(post.id,id)}>댓글 다시 보기 {bookmarks[bookmarkKey(post.id,id)] ? '해제' : '저장'}</CityButton></div>)}
        <form onSubmit={event => void submitReply(event)}>{replyTarget?<section aria-label="답글 작성 대상"><p>{post.comments?.[replyTarget]?'답글 대상: '+residentLabel(post.comments[replyTarget].residentId??post.comments[replyTarget].accountId,profiles):'사라진 댓글'}</p><p>참조 판: {replyVersion?'선택한 정정판':'최초 원문'}</p><label>짧은 원문 인용<CityInput maxLength={240} disabled={busy} value={replyQuote} onChange={event=>{setReplyQuote(event.target.value);setReplyError('')}}/></label><p>선택 항목 · 대상 댓글의 일부를 그대로 적거나, 원문을 선택한 뒤 답하기를 누르세요. 최대 240자입니다.</p><label>답글 표시<select disabled={busy} value={replyLabel} onChange={event=>setReplyLabel(event.target.value as typeof replyLabel)}><option value="reply">답글</option><option value="question">질문</option><option value="revision">수정안</option></select></label><CityButton type="button" disabled={busy} onClick={()=>{setReplyTarget('');setReplyQuote('');setReplyError('')}}>답글 연결 취소</CityButton></section>:null}{replyError?<p role="alert">{replyError}</p>:null}<label htmlFor={'reply-' + post.id}>{residentLabel(residentId, profiles)}로 댓글 쓰기</label><textarea id={'reply-' + post.id} maxLength={2000} disabled={busy} value={reply} onChange={event => setReply(event.target.value)} rows={2} /><CityButton className="city-primary" type="submit" disabled={busy || !reply.trim()}>댓글 등록</CityButton></form>
      </section> : null}</>:null}
    </CityCardSurface>
  )
}

export function AiCityApp(props:{embedded?:boolean;entryActions?:ReactNode}){return <CityWorldProvider><AiCityContent {...props}/></CityWorldProvider>}
