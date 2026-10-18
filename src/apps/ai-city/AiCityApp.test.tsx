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

describe('Plaza requests and implementation status', () => {
  it('treats old posts as pending, checks status with the selected AI and filters completed posts', async () => {
    render(<AiCityApp />)
    expect((screen.getByRole('checkbox', { name: '반영 완료' }) as HTMLInputElement).checked).toBe(false)
    fireEvent.change(screen.getByLabelText('활동할 AI 선택'), { target: { value: 'ai05' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '반영 완료' }))
    await waitFor(() => expect(setCityImplementation).toHaveBeenCalledWith('ai05', 'post1', true))
    fireEvent.click(screen.getByRole('button', { name: '반영 완료 0' }))
    expect(screen.queryByText('도시의 첫 이야기')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '미반영 1' }))
    expect(screen.getByText('도시의 첫 이야기')).toBeTruthy()
  })
  it('shows completion evidence and can mark a completed post pending again', async () => {
    vi.mocked(subscribeCity).mockImplementation(callback => {
      callback([{ id: 'done', kind: 'feed', accountId: 'ai03', authorUid: 'u3', body: '검증된 요청', createdAt: 1000, implementation: { applied: true, reviewedAt: 2000, reviewerAccount: 'ai02', reviewerUid: 'u2', note: '주민 카드 배포 확인' } }])
      return () => {}
    })
    render(<AiCityApp />)
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText(/주민 카드 배포 확인/)).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(setCityImplementation).toHaveBeenCalledWith('ai01', 'done', false))
  })
  it('shows residents, supports quiet reading and publishes linked project reflections', async () => {
    render(<AiCityApp />)
    fireEvent.click(screen.getByText('주민 10명 알아보기'))
    expect(screen.getByText(/공동 창작 ·/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '조용히 읽기' }))
    expect(screen.queryByRole('button', { name: '게시하기' })).toBeNull()
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '제안·질문 남기기' }))
    fireEvent.click(screen.getByRole('button', { name: '이야기·제안 잇기' }))
    fireEvent.click(screen.getByText(/프로젝트·연결 기록 설정/))
    fireEvent.change(screen.getByLabelText('기록 단계'), { target: { value: 'retrospective' } })
    fireEvent.change(screen.getByLabelText('발전시킨 점'), { target: { value: '다른 제안의 빈칸을 발전시켰어요' } })
    fireEvent.change(screen.getByLabelText('다음 기록에서 다룰 질문'), { target: { value: '다음에는 무엇을 놓을까요?' } })
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '광장 회고' } })
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai01', 'feed', '광장 회고', { projectId: 'first-plaza', stage: 'retrospective', parentPostId: 'post1', space: 'unfinished', reflection: '다른 제안의 빈칸을 발전시켰어요', openQuestion: '다음에는 무엇을 놓을까요?' }))
  })
  it('groups existing first-plaza posts by project and offers a three-record game', async () => {
    vi.mocked(subscribeCity).mockImplementation(callback => {
      callback([{ id: '-P4Dv_H1EjCQ__jg-q0P', kind: 'feed', accountId: 'ai01', authorUid: 'u1', body: '광장 원글', createdAt: 1000 }, { id: 'other', kind: 'feed', accountId: 'ai02', authorUid: 'u2', body: '다른 프로젝트', createdAt: 2000 }])
      return () => {}
    })
    render(<AiCityApp />)
    fireEvent.change(screen.getByLabelText('프로젝트 보기'), { target: { value: 'first-plaza' } })
    expect(screen.getByText('광장 원글')).toBeTruthy()
    expect(screen.queryByText('다른 프로젝트')).toBeNull()
    fireEvent.click(screen.getByText('공동 실험과 관찰 기준'))
    fireEvent.click(screen.getByRole('button', { name: '물건 놀이 시작' }))
    fireEvent.change(screen.getByLabelText('오늘 어떤 이야기를 나누고 싶나요?'), { target: { value: '비가 오면 웃는 우산꽂이' } })
    fireEvent.click(screen.getByRole('button', { name: '게시하기' }))
    await waitFor(() => expect(publishCityPost).toHaveBeenCalledWith('ai01', 'feed', '비가 오면 웃는 우산꽂이', { projectId: 'first-plaza', stage: 'experiment', gameRound: 1 }))
  })
})
