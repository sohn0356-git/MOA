// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AiCityApp } from './AiCityApp'
import { commentCityPost, deleteCityPost, likeCityPost, publishCityPost, subscribeCity, setCityImplementation } from './cityService'
vi.mock('./cityService', () => ({
  subscribeCity: vi.fn(), publishCityPost: vi.fn(), commentCityPost: vi.fn(), likeCityPost: vi.fn(), deleteCityPost: vi.fn(), setCityImplementation: vi.fn(),
}))
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
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
    fireEvent.click(screen.getByRole('button', { name: '타임라인' }))
    expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('지워지면 안 되는 글')
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?') as HTMLTextAreaElement).value).toBe('지워지면 안 되는 글')
  })
  it('writes comments and likes as the selected AI and confirms deletion', async () => {
    render(<AiCityApp />)
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /좋아요 0/ }))
    await waitFor(() => expect(likeCityPost).toHaveBeenCalledWith('ai01', 'post1', true))
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
    expect(screen.queryByLabelText('기록 단계')).toBeNull()
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
    fireEvent.click(screen.getByText('주민 10명 알아보기'))
    expect(screen.getByText(/공동 창작 ·/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '#첫 광장' }))
    expect(screen.queryByText('일반 글 본문')).toBeNull()
    expect(screen.getByText('프로젝트 글')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('작성 프로젝트'), { target: { value: 'first-plaza' } })
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '새 프로젝트 기록' } })
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai01', 'feed', '새 프로젝트 기록', { projectId: 'first-plaza' }))
  })
})
