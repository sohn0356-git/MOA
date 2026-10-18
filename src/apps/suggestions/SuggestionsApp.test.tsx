// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SuggestionsApp } from './SuggestionsApp'

const mocks = vi.hoisted(() => ({ update: vi.fn(), remove: vi.fn() }))
vi.mock('../../services/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { uid: 'alice', displayName: 'Alice' } }),
  getFirebaseConfigError: () => null,
  getRealtimeDb: () => ({}),
}))
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => path,
  onValue: (_ref: unknown, callback: (value: { val: () => unknown }) => void) => {
    callback({ val: () => ({
      a: { authorUid: 'alice', authorName: 'Alice', title: '내 의견', body: '내 내용', createdAt: 1, isCompleted: true, completedAt: 10, completedByUid: 'bob', completedByName: 'Bob' },
      b: { authorUid: 'bob', authorName: 'Bob', title: '다른 의견', body: '다른 내용', createdAt: 2, isCompleted: false },
    }) })
    return () => {}
  },
  update: mocks.update, remove: mocks.remove, push: vi.fn(), get: vi.fn(),
}))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
beforeEach(() => { mocks.update.mockReset().mockResolvedValue(undefined); mocks.remove.mockReset().mockResolvedValue(undefined) })

function ownerCard() { return screen.getByText('내 의견').closest('article')! }

describe('suggestion owner actions', () => {
  it('shows edit and delete only on the author’s own item and preserves completion on save', async () => {
    render(<SuggestionsApp embedded />)
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
    render(<SuggestionsApp embedded />)
    fireEvent.click(within(ownerCard()).getByRole('button', { name: '수정' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('form', { name: '개선 의견 수정' })).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('requires delete confirmation and deletes only the selected item', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SuggestionsApp embedded />)
    fireEvent.click(within(ownerCard()).getByRole('button', { name: '삭제' }))
    expect(mocks.remove).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(within(ownerCard()).getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('suggestions/a'))
  })

  it('keeps the edit form for retry when saving fails', async () => {
    mocks.update.mockRejectedValueOnce(new Error('permission denied'))
    render(<SuggestionsApp embedded />)
    fireEvent.click(within(ownerCard()).getByRole('button', { name: '수정' }))
    fireEvent.submit(screen.getByRole('form', { name: '개선 의견 수정' }))
    await waitFor(() => expect(screen.getByText(/의견을 수정하지 못했습니다/)).toBeTruthy())
    expect(screen.getByRole('form', { name: '개선 의견 수정' })).toBeTruthy()
  })
})
