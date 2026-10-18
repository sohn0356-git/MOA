// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { draftStorageKey, requestDraftNavigation, useSuggestionDraft } from './useSuggestionDraft'

beforeEach(() => { localStorage.clear() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })

describe('account-scoped suggestion drafts', () => {
  it('automatically saves both fields with a time and offers explicit restore on return', () => {
    const first = renderHook(() => useSuggestionDraft('alice'))
    act(() => first.result.current.change({ title: '초안 제목', body: '긴 개선 의견' }))
    const saved = JSON.parse(localStorage.getItem(draftStorageKey('alice'))!)
    expect(saved).toMatchObject({ title: '초안 제목', body: '긴 개선 의견', savedAt: expect.any(Number) })
    expect(first.result.current.unsaved).toBe(false)
    first.unmount()
    const second = renderHook(() => useSuggestionDraft('alice'))
    expect(second.result.current.title).toBe('')
    expect(second.result.current.candidate?.title).toBe('초안 제목')
    act(() => second.result.current.resume())
    expect(second.result.current.body).toBe('긴 개선 의견')
    expect(second.result.current.savedAt).toBe(saved.savedAt)
    act(() => second.result.current.discard())
    expect(localStorage.getItem(draftStorageKey('alice'))).toBeNull()
    expect(second.result.current.title).toBe('')
  })

  it('keeps accounts isolated when switching users', () => {
    const { result, rerender } = renderHook(({ uid }) => useSuggestionDraft(uid), { initialProps: { uid: 'alice' } })
    act(() => result.current.change({ title: 'Alice draft' }))
    rerender({ uid: 'bob' })
    expect(result.current.title).toBe('')
    expect(result.current.candidate).toBeNull()
    act(() => result.current.change({ title: 'Bob draft' }))
    rerender({ uid: 'alice' })
    expect(result.current.candidate?.title).toBe('Alice draft')
    expect(JSON.parse(localStorage.getItem(draftStorageKey('bob'))!).title).toBe('Bob draft')
  })

  it('does not prompt for saved content and protects only unsaved changes', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { result } = renderHook(() => useSuggestionDraft('alice'))
    act(() => result.current.change({ body: 'saved' }))
    expect(requestDraftNavigation()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    act(() => result.current.change({ body: 'not yet saved' }))
    expect(result.current.unsaved).toBe(true)
    expect(requestDraftNavigation()).toBe(false)
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    storage.mockRestore()
    act(() => result.current.retrySave())
    expect(result.current.unsaved).toBe(false)
    expect(requestDraftNavigation()).toBe(true)
    expect(JSON.parse(localStorage.getItem(draftStorageKey('alice'))!).body).toBe('not yet saved')
  })

  it('clears the stored draft on successful registration', () => {
    const { result } = renderHook(() => useSuggestionDraft('alice'))
    act(() => result.current.change({ title: 'Title', body: 'Body' }))
    act(() => result.current.submitted())
    expect(result.current.title).toBe('')
    expect(result.current.body).toBe('')
    expect(result.current.unsaved).toBe(false)
    expect(localStorage.getItem(draftStorageKey('alice'))).toBeNull()
  })

  it('does not erase the new account draft when an old submission finishes late', () => {
    const { result, rerender } = renderHook(({ uid }) => useSuggestionDraft(uid), { initialProps: { uid: 'alice' } })
    act(() => result.current.change({ title: 'Alice title' }))
    const oldSubmission = result.current.submitted
    rerender({ uid: 'bob' })
    act(() => result.current.change({ title: 'Bob title' }))
    act(() => oldSubmission())
    expect(result.current.title).toBe('Bob title')
    expect(JSON.parse(localStorage.getItem(draftStorageKey('bob'))!).title).toBe('Bob title')
    expect(localStorage.getItem(draftStorageKey('alice'))).toBeNull()
  })

  it('handles corrupt storage without crashing and respects input limits', () => {
    localStorage.setItem(draftStorageKey('alice'), '{broken')
    const { result } = renderHook(() => useSuggestionDraft('alice'))
    expect(result.current.error).toContain('불러오지 못했습니다')
    act(() => result.current.change({ title: 'x'.repeat(100), body: 'y'.repeat(1400) }))
    expect(result.current.title).toHaveLength(80)
    expect(result.current.body).toHaveLength(1200)
    expect(result.current.error).toBe('')
  })
})
