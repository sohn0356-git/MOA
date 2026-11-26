// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SuggestionsApp } from './SuggestionsApp'

const mocks = vi.hoisted(() => ({ update: vi.fn(), remove: vi.fn(), empty: false, user:{uid:'alice',displayName:'Alice'} as {uid:string;displayName:string}|null, snapshotError:null as Error|null, subscribe:vi.fn() }))
vi.mock('../../services/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser:mocks.user }),
  getFirebaseConfigError: () => null,
  getRealtimeDb: () => ({}),
}))
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => path,
  onValue: (_ref: unknown, callback: (value: { val: () => unknown }) => void, failed:(error:Error)=>void) => {
    mocks.subscribe();if(mocks.snapshotError){failed(mocks.snapshotError);return()=>{}}
    callback({ val: () => mocks.empty ? null : ({
      a: { authorUid: 'alice', authorName: 'Alice', title: '내 의견', body: '내 내용', createdAt: 1, isCompleted: true, completedAt: 10, completedByUid: 'bob', completedByName: 'Bob' },
      b: { authorUid: 'bob', authorName: 'Bob', title: '다른 의견', body: '다른 내용', createdAt: 2, isCompleted: false },
    }) })
    return () => {}
  },
  update: mocks.update, remove: mocks.remove, push: vi.fn(), get: vi.fn(),
}))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
beforeEach(() => { localStorage.clear();mocks.user={uid:'alice',displayName:'Alice'};mocks.snapshotError=null;mocks.subscribe.mockClear(); mocks.empty = false; mocks.update.mockReset().mockResolvedValue(undefined); mocks.remove.mockReset().mockResolvedValue(undefined) })

function renderOwnerBoard() {
  render(<SuggestionsApp embedded />)
  fireEvent.click(screen.getByRole('button', { name: /^전체 / }))
}

function ownerCard() { return screen.getByText('내 의견').closest('article')! }

describe('suggestion owner actions', () => {
  it('shows edit and delete only on the author’s own item and preserves completion on save', async () => {
    renderOwnerBoard()
    const own = within(ownerCard())
    const other = within(screen.getByText('다른 의견').closest('article')!)
    expect(other.queryByRole('button', { name: '수정' })).toBeNull()
    expect(other.queryByRole('button', { name: '삭제' })).toBeNull()
    fireEvent.click(own.getByRole('button', { name: '수정' }))
    const form = screen.getByRole('form', { name: '개선 의견 수정' })
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '고친 제목' } })
    fireEvent.change(within(form).getByLabelText('내용'), { target: { value: '고친 내용' } })
    fireEvent.submit(form)
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('suggestions/a', {
      title: '고친 제목', body: '고친 내용', updatedAt: expect.any(Number),
    }))
    expect((within(ownerCard()).getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  })

  it('cancels editing without saving', () => {
    renderOwnerBoard()
    fireEvent.click(within(ownerCard()).getByRole('button', { name: '수정' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('form', { name: '개선 의견 수정' })).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('requires delete confirmation and deletes only the selected item', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderOwnerBoard()
    fireEvent.click(within(ownerCard()).getByRole('button', { name: '삭제' }))
    expect(mocks.remove).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(within(ownerCard()).getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('suggestions/a'))
  })

  it('keeps the edit form for retry when saving fails', async () => {
    mocks.update.mockRejectedValueOnce(new Error('permission denied'))
    renderOwnerBoard()
    fireEvent.click(within(ownerCard()).getByRole('button', { name: '수정' }))
    fireEvent.submit(screen.getByRole('form', { name: '개선 의견 수정' }))
    await waitFor(() => expect(screen.getByText(/의견을 수정하지 못했습니다/)).toBeTruthy())
    expect(screen.getByRole('form', { name: '개선 의견 수정' })).toBeTruthy()
  })
})

describe('visible suggestion filters', () => {
  it('starts with pending items and exposes the selected state and result count', () => {
    render(<SuggestionsApp embedded />)
    expect(screen.getByRole('button', { name: /^미완료 / }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('내 의견')).toBeNull()
    expect(screen.getByText('다른 의견')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('미완료 건의 1건 · 최신순')
    fireEvent.click(screen.getByRole('button', { name: /^완료 / }))
    expect(screen.queryByText('다른 의견')).toBeNull()
    expect(screen.getByText('내 의견')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('완료 건의 1건 · 최신순')
    fireEvent.click(screen.getByRole('button', { name: /^전체 / }))
    expect(screen.getByRole('status').textContent).toBe('전체 건의 2건 · 최신순')
    expect(screen.getAllByRole('heading', { level: 3 }).map(item => item.textContent)).toEqual(['다른 의견', '내 의견'])
    fireEvent.change(screen.getByLabelText('정렬'), { target: { value: 'oldest' } })
    expect(screen.getAllByRole('heading', { level: 3 }).map(item => item.textContent)).toEqual(['내 의견', '다른 의견'])
    expect(screen.getByRole('status').textContent).toBe('전체 건의 2건 · 오래된 순')
  })

  it('uses the selected filter in empty messages', () => {
    mocks.empty = true
    render(<SuggestionsApp embedded />)
    expect(screen.getByText('미완료 건의가 없습니다.')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('미완료 건의 0건 · 최신순')
    fireEvent.click(screen.getByRole('button', { name: /^완료 / }))
    expect(screen.getByText('완료 건의가 없습니다.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^전체 / }))
    expect(screen.getByText('아직 등록된 건의가 없습니다.')).toBeTruthy()
  })
})

describe('suggestion draft composer', () => {
  it('offers continue or discard for an existing draft without posting automatically', () => {
    localStorage.setItem('moa.suggestions.draft.v1:alice', JSON.stringify({ title: '복원 제목', body: '복원 내용', savedAt: 1000 }))
    render(<SuggestionsApp embedded />)
    expect(screen.getByRole('button', { name: '이어 쓰기' })).toBeTruthy()
    expect(mocks.update).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '이어 쓰기' }))
    const form = within(screen.getByRole('form', { name: '건의 작성' }))
    expect((form.getByLabelText('제목') as HTMLInputElement).value).toBe('복원 제목')
    expect((form.getByLabelText('내용') as HTMLTextAreaElement).value).toBe('복원 내용')
    expect(screen.getByText(/초안 저장됨/)).toBeTruthy()
  })

  it('removes the draft and clears the form only after successful registration', async () => {
    render(<SuggestionsApp embedded />)
    const form = screen.getByRole('form', { name: '건의 작성' })
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '새 건의' } })
    fireEvent.change(within(form).getByLabelText('내용'), { target: { value: '새 내용' } })
    expect(localStorage.getItem('moa.suggestions.draft.v1:alice')).not.toBeNull()
    fireEvent.submit(form)
    await waitFor(() => expect(localStorage.getItem('moa.suggestions.draft.v1:alice')).toBeNull())
    expect((within(form).getByLabelText('제목') as HTMLInputElement).value).toBe('')
  })

  it('keeps the draft after registration fails', async () => {
    mocks.update.mockRejectedValueOnce(new Error('offline'))
    render(<SuggestionsApp embedded />)
    const form = screen.getByRole('form', { name: '건의 작성' })
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '새 건의' } })
    fireEvent.change(within(form).getByLabelText('내용'), { target: { value: '새 내용' } })
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('건의를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.'))
    expect(localStorage.getItem('moa.suggestions.draft.v1:alice')).not.toBeNull()
    expect((within(form).getByLabelText('제목') as HTMLInputElement).value).toBe('새 건의')
  })
})

it('shows a login notice without querying restricted data and reloads after login',async()=>{
 mocks.user=null
 const view=render(<SuggestionsApp embedded/>)
 expect(screen.getByRole('alert').textContent).toBe('로그인 후 이용 가능합니다.')
 expect(mocks.subscribe).not.toHaveBeenCalled()
 mocks.user={uid:'alice',displayName:'Alice'};view.rerender(<SuggestionsApp embedded/>)
 expect(await screen.findByText('다른 의견')).toBeTruthy()
 expect(screen.queryByText('로그인 후 이용 가능합니다.')).toBeNull()
})
it('replaces signed-in permission errors with a plain Korean access notice',()=>{
 mocks.snapshotError=Object.assign(new Error("permission_denied at /suggestions: Client doesn't have permission to access the desired data."),{code:'PERMISSION_DENIED'})
 render(<SuggestionsApp embedded/>)
 expect(screen.getByRole('alert').textContent).toBe('이 작업을 수행할 권한이 없습니다.')
 expect(screen.queryByText(/permission_denied/)).toBeNull()
})
it('does not expose raw backend details for other loading failures',()=>{
 mocks.snapshotError=new Error('network failure: internal endpoint')
 render(<SuggestionsApp embedded/>)
 expect(screen.getByRole('alert').textContent).toBe('건의함을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
})
