// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useDevotionDraft, DEVOTION_DRAFT_PREFIX, type DraftContent } from './useDevotionDraft'
import { normalizeDevotionFields } from './devotionEditing'
import { canApplyAppUpdate } from '../../lib/appUpdateProtocol'
const content = (mind = '작성 중인 묵상'): DraftContent => ({ mode: 'write', entryId: '', values: { ...normalizeDevotionFields({ mind, audience: 'public', selectedDate: '2026-11-05', selectedVerseNumbers: [1], crossImage: 'data:image/png;base64,AAAA' }, '2026-11-05'), groupName: '매일 묵상' } })
const records = () => Object.keys(localStorage).filter(key => key.startsWith(DEVOTION_DRAFT_PREFIX)).map(key => JSON.parse(localStorage.getItem(key)!))
beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('durable devotion drafts', () => {
  it('persists every change including image, edit source, date and group and recovers after remount', () => {
    const value = { ...content(), mode: 'edit' as const, entryId: 'original', source: { id: 'original', authorUid: 'ai01' } }
    const first = renderHook(({ v }) => useDevotionDraft('ai01', true, v), { initialProps: { v: value } })
    first.rerender({ v: { ...value, values: { ...value.values, mind: '마지막 한 글자까지' } } })
    expect(records()[0].values.mind).toBe('마지막 한 글자까지')
    first.unmount()
    const second = renderHook(() => useDevotionDraft('ai01', false, content('')))
    expect(second.result.current.drafts).toHaveLength(1)
    expect(second.result.current.drafts[0]).toMatchObject({ mode: 'edit', entryId: 'original', source: value.source, values: { groupName: '매일 묵상', crossImage: value.values.crossImage, selectedVerseNumbers: [1], mind: '마지막 한 글자까지' } })
  })
  it('separates owners and does not copy old text to a newly selected identity', () => {
    const hook = renderHook(({ owner, active }) => useDevotionDraft(owner, active, content()), { initialProps: { owner: 'ai01', active: true } })
    hook.rerender({ owner: 'ai02', active: false })
    expect(hook.result.current.drafts).toHaveLength(0)
    expect(records().map(record => record.owner)).toEqual(['ai01'])
    hook.rerender({ owner: 'ai01', active: false })
    expect(hook.result.current.drafts).toHaveLength(1)
  })
  it('keeps independent records for simultaneous tabs and clears only a confirmed submitted draft', () => {
    const first = renderHook(() => useDevotionDraft('ai01', true, content('첫 창')))
    const second = renderHook(() => useDevotionDraft('ai01', true, content('두 번째 창')))
    expect(records()).toHaveLength(2)
    act(() => first.result.current.clear())
    expect(records()).toHaveLength(1)
    expect(records()[0].values.mind).toBe('두 번째 창')
    second.unmount()
  })
  it('flushes immediate typing before unload and prevents updates until the composer is closed', () => {
    const hook = renderHook(({ active }) => useDevotionDraft('ai01', active, content()), { initialProps: { active: true } })
    act(() => { hook.result.current.flush({ mind: '리렌더 전 입력' }) })
    expect(records()[0].values.mind).toBe('리렌더 전 입력')
    let allowed = true
    act(() => { allowed = canApplyAppUpdate() })
    expect(allowed).toBe(false)
    const unload = new Event('beforeunload', { cancelable: true })
    act(() => { window.dispatchEvent(unload); window.dispatchEvent(new Event('pagehide')) })
    expect(unload.defaultPrevented).toBe(true)
    hook.rerender({ active: false })
    expect(canApplyAppUpdate()).toBe(true)
  })
  it('reports storage failure and protects the editor rather than claiming a successful autosave', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    const hook = renderHook(() => useDevotionDraft('ai01', true, content()))
    expect(hook.result.current.savedAt).toBeNull()
    expect(hook.result.current.error).toContain('임시저장에 실패')
    let allowed = true
    act(() => { allowed = canApplyAppUpdate() })
    expect(allowed).toBe(false)
    expect(records()).toHaveLength(0)
  })
})
