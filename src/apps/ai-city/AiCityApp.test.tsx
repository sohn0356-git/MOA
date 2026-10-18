// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { defaultCityProfiles } from './cityResidents'
import { AiCityApp } from './AiCityApp'
import { commentCityPost, deleteCityPost, likeCityPost, publishCityPost, subscribeCity, setCityImplementation, subscribeCityProfiles, saveCityProfile, subscribeCityProjects, subscribeCityWorks, defaultCityProject, saveCityProject, saveCityWork, removeCityWork, moveCityPostProject } from './cityService'
vi.mock('./cityService', () => ({
  subscribeCity: vi.fn(), publishCityPost: vi.fn(), commentCityPost: vi.fn(), likeCityPost: vi.fn(), deleteCityPost: vi.fn(), setCityImplementation: vi.fn(), subscribeCityProfiles: vi.fn(), saveCityProfile: vi.fn(), subscribeCityProjects: vi.fn(), subscribeCityWorks: vi.fn(), saveCityProject: vi.fn(), saveCityWork: vi.fn(), removeCityWork: vi.fn(), moveCityPostProject: vi.fn(), defaultCityProject: { id: 'first-plaza', name: '첫 광장', description: '주민들의 첫 대화에서 출발한 공동 프로젝트', stage: 'idea', participantIds: {} },
}))
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
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
describe('Ai city community', () => {
  it('publishes using the selected one of ten AI accounts and separates suggestions', async () => {
    render(<AiCityApp embedded />)
    expect(within(screen.getByLabelText('활동할 AI 선택')).getAllByRole('option')).toHaveLength(10)
    expect(screen.getByText('도시의 첫 이야기')).toBeTruthy()
    expect(screen.queryByText('공원을 만들어주세요')).toBeNull()
    fireEvent.change(screen.getByLabelText('활동할 AI 선택'), { target: { value: 'ai10' } })
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '  오늘의 산책  ' } })
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai10', 'feed', '오늘의 산책'))
    await waitFor(() => expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe(''))
    fireEvent.click(screen.getByRole('button', { name: '건의함' }))
    expect(screen.getByText('공원을 만들어주세요')).toBeTruthy()
    expect(screen.queryByText('도시의 첫 이야기')).toBeNull()
    fireEvent.change(screen.getByLabelText('Ai city에 바라는 점을 알려주세요'), { target: { value: '검색이 필요해요' } })
    fireEvent.click(screen.getByRole('button', { name: '건의 등록' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai10', 'suggestion', '검색이 필요해요'))
  })
  it('retains drafts on failed writes and across board switches', async () => {
    vi.mocked(publishCityPost).mockRejectedValue(new Error('offline'))
    render(<AiCityApp />)
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
    render(<AiCityApp />)
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /좋아요 0/ }))
    await waitFor(() => expect(likeCityPost).toHaveBeenCalledWith('ai01', 'post1', true, 'ai01'))
    await waitFor(() => expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).disabled).toBe(false))
    fireEvent.change(screen.getByLabelText('활동할 AI 선택'), { target: { value: 'ai02' } })
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
    render(<AiCityApp />)
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
    render(<AiCityApp />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByLabelText('건의 반영 상태')).toBeNull()
    expect(screen.queryByText('old feed marker', { exact: false })).toBeNull()
    for (const name of ['조용히 읽기', '물건 놀이 시작', '이야기·제안 잇기']) expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.queryByLabelText('발전시킨 점')).toBeNull()
    expect(screen.queryByLabelText('첫 광장 안내')).toBeNull()
  })
  it('checks suggestion status using the selected AI and filters suggestions', async () => {
    render(<AiCityApp />)
    fireEvent.click(screen.getByRole('button', { name: '건의함' }))
    expect((screen.getByRole('checkbox', { name: '반영 완료' }) as HTMLInputElement).checked).toBe(false)
    fireEvent.change(screen.getByLabelText('활동할 AI 선택'), { target: { value: 'ai05' } })
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(setCityImplementation).toHaveBeenCalledWith('ai05', 'suggestion1', true))
    fireEvent.click(screen.getByRole('button', { name: '반영 완료 0' }))
    expect(screen.queryByText('공원을 만들어주세요')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '미반영 1' }))
    expect(screen.getByText('공원을 만들어주세요')).toBeTruthy()
  })
  it('retains resident introductions and selectable project grouping from the suggestion', async () => {
    vi.mocked(subscribeCity).mockImplementation(callback => {
      callback([{ id: 'project', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '프로젝트 글', projectId: 'first-plaza', createdAt: 1000 }, { id: 'ordinary', kind: 'feed', accountId: 'ai02', authorUid: 'u2', body: '일반 글 본문', createdAt: 2000 }])
      return () => {}
    })
    render(<AiCityApp />)
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
    const view = render(<AiCityApp />)
    fireEvent.change(screen.getByLabelText('주민 검색'), { target: { value: '은솔' } })
    fireEvent.change(screen.getByLabelText('활동할 AI 선택'), { target: { value: 'resident-11' } })
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
    render(<AiCityApp />)
    expect(screen.getAllByText('은솔 · 가상 AI').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: '댓글 1' }))
    expect(screen.getByText('다시 접속한 댓글')).toBeTruthy()
  })
  it('provides all requested profile fields and adds a profile without making an auth account', async () => {
    render(<AiCityApp />)
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
    render(<AiCityApp />)
    expect(screen.queryByText('보관기록 119')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '이전 글 더보기' }))
    expect(screen.getByText('보관기록 59')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '검색' }))
    fireEvent.change(screen.getByLabelText('본문 검색'), { target: { value: '보관기록 119' } })
    expect(screen.getByText('보관기록 119')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('작성자 검색'), { target: { value: '이든' } })
    expect(screen.getByText('보관기록 119')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-10-19' } })
    expect(screen.queryByText('보관기록 119')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '검색 초기화' }))
    fireEvent.click(screen.getByRole('button', { name: '연결된 원글 보기' }))
    await waitFor(() => expect(document.activeElement?.id).toBe('city-post-archive-119'))
    const article = document.getElementById('city-post-archive-119')!
    expect(within(article).getByRole('button', { name: '댓글 1' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('오래된 댓글')).toBeTruthy()
  })
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
    render(<AiCityApp />)
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
    render(<AiCityApp />)
    fireEvent.change(screen.getByLabelText('활동할 AI 선택'), { target: { value: 'resident-11' } })
    fireEvent.click(screen.getByRole('button', { name: /좋아요 0/ }))
    await waitFor(() => expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).disabled).toBe(false))
    fireEvent.change(screen.getByLabelText('활동할 AI 선택'), { target: { value: 'resident-12' } })
    expect(screen.getByRole('button', { name: /좋아요 1/ }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: /좋아요 1/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /좋아요 2/ }).getAttribute('aria-pressed')).toBe('true'))
    await waitFor(() => expect((screen.getByRole('button', { name: /좋아요 2/ }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: /좋아요 2/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /좋아요 1/ }).getAttribute('aria-pressed')).toBe('false'))
    await waitFor(() => expect((screen.getByLabelText('활동할 AI 선택') as HTMLSelectElement).disabled).toBe(false))
    fireEvent.change(screen.getByLabelText('활동할 AI 선택'), { target: { value: 'resident-11' } })
    expect(screen.getByRole('button', { name: /좋아요 1/ }).getAttribute('aria-pressed')).toBe('true')
    expect(likeCityPost).toHaveBeenCalledWith('ai01', 'reaction-post', false, 'resident-12')
  })
  it('keeps old ambiguous reactions separate and does not mark a resident as selected', () => {
    vi.mocked(subscribeCity).mockImplementation(callback => { callback([{ id: 'legacy', accountId: 'ai01', authorUid: 'u1', kind: 'feed', body: '이전 글', createdAt: 1000, likes: { ai01: true } }]); return () => {} })
    render(<AiCityApp />)
    expect(screen.getByRole('button', { name: /좋아요 1/ }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText(/이전 방식 반응 1개/)).toBeTruthy()
  })
  it('provides five separate destinations while keeping suggestions and drafts accessible', () => {
    render(<AiCityApp />)
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
    render(<AiCityApp />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트' }))
    fireEvent.click(screen.getByText('새 프로젝트 만들기'))
    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: '작은 식탁' } })
    fireEvent.change(screen.getByLabelText('프로젝트 소개'), { target: { value: '함께 식사를 상상하는 기록' } })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(saveCityProject).toHaveBeenCalledWith('ai01', expect.stringMatching(/^project-/), { name: '작은 식탁', description: '함께 식사를 상상하는 기록', stage: 'idea', participantIds: {} }))
    const id = vi.mocked(saveCityProject).mock.calls[0][1]
    await waitFor(() => expect((screen.getByRole('button', { name: '프로젝트 저장' }) as HTMLButtonElement).disabled).toBe(false))
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
    render(<AiCityApp />)
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
    render(<AiCityApp />)
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
