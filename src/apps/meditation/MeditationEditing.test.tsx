// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MeditationApp } from './MeditationApp'
const state = vi.hoisted(() => ({
  user: { uid: 'owner', displayName: 'Google 사용자', email: 'owner@example.com', photoURL: '' },
  entries: {} as Record<string, unknown>,
  update: vi.fn(),
  plan: { date: '2026-10-31', title: '말씀', theme: '사랑', reference: '요한복음 13:34', question: '오늘의 적용은?', verses: [{ number: 1, text: '서로 사랑하라' }] },
}))
vi.mock('../../services/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: state.user }), getRealtimeDb: () => ({}), getFirebaseStorage: () => ({}),
}))
vi.mock('../../services/faithSession', () => ({ getFaithAuth: () => ({ currentUser: state.user }), getFaithDb: () => ({}), getFaithStorage: () => ({}) }))
vi.mock('firebase/auth', () => ({ updateProfile: vi.fn() }))
vi.mock('firebase/storage', () => ({ deleteObject: vi.fn(), getDownloadURL: vi.fn(), ref: vi.fn(), uploadBytesResumable: vi.fn() }))
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path = '') => path,
  onValue: (path: string, callback: (snapshot: { val: () => unknown }) => void) => {
    callback({ val: () => path === 'users/' + state.user.uid + '/meditationEntries' ? state.entries : null })
    return () => {}
  },
  get: vi.fn(async () => ({ val: () => null })), push: () => ({ key: 'new-entry' }),
  update: state.update, set: vi.fn(), remove: vi.fn(), runTransaction: vi.fn(), serverTimestamp: () => 123,
}))
vi.mock('./useScripturePlan', () => ({ useScripturePlan: () => ({ remotePlan: state.plan, isLoading: false, error: '', isFallback: false, retry: vi.fn() }) }))
const image = 'data:image/png;base64,AAAA'
beforeEach(() => {
  localStorage.clear()
  state.user.uid = 'owner'
  state.update.mockReset().mockResolvedValue(undefined)
  state.entries = { original: {
    authorUid: 'owner', authorName: 'AI 01', activityId: 'ai01',
    mind: '수정 전 묵상', apply: '오늘의 적용', prayer: '기도', audience: 'private',
    reference: '요한복음 13:34', theme: '사랑', selectedDate: '2026-10-15', createdAt: '2026-10-15T01:00:00.000Z',
    selectedVerseNumbers: [1], verseText: '서로 사랑하라', crossImage: image,
  } }
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
async function openEdit() {
  render(<MeditationApp activityId="ai03"/>)
  fireEvent.click(within(screen.getByRole('navigation', { name: 'MOA Faith' })).getByRole('button', { name: '묵상' }))
  fireEvent.click(screen.getByRole('tab', { name: '내 묵상' }))
  fireEvent.click(await screen.findByText('수정 전 묵상'))
  fireEvent.click(screen.getByRole('button', { name: '묵상 수정' }))
  return screen.findByRole('heading', { name: '묵상 수정' })
}
describe('real devotion editing and activity authorship', () => {
  it.each([undefined, null, {}])('edits and saves a Firebase record whose empty verse list is missing (%s)', async selectedVerseNumbers => {
    const original = state.entries.original as Record<string, unknown>
    state.entries.original = { ...original, selectedVerseNumbers }
    if (selectedVerseNumbers === undefined) delete (state.entries.original as Record<string, unknown>).selectedVerseNumbers
    await openEdit()
    const memo = screen.getByRole('textbox', { name: /묵상 메모/ })
    expect((memo as HTMLTextAreaElement).value).toBe('수정 전 묵상')
    fireEvent.change(memo, { target: { value: '말씀 선택 없이 수정한 묵상' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.update).toHaveBeenCalled())
    const payload = state.update.mock.calls.find(call => call[1]['users/owner/meditationEntries/original'])![1]['users/owner/meditationEntries/original']
    expect(payload.selectedVerseNumbers).toEqual([])
    expect(payload.mind).toBe('말씀 선택 없이 수정한 묵상')
    expect(payload.verseText).toBe(original.verseText)
    expect(payload.crossImage).toBe(image)
    await waitFor(() => expect(screen.getAllByText('말씀 선택 없이 수정한 묵상').length).toBeGreaterThan(0))
  })

  it('edits an existing AI-owned devotion with the selected AI authentication UID', async () => {
    state.user.uid = 'ai03'
    state.entries.original = { ...(state.entries.original as object), authorUid: 'ai03', authorName: 'AI 03', activityId: 'ai03' }
    await openEdit()
    fireEvent.change(screen.getByRole('textbox', { name: /묵상 메모/ }), { target: { value: 'AI 03 기존 글 수정' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.update).toHaveBeenCalled())
    const payload = state.update.mock.calls.find(call => call[1]['users/ai03/meditationEntries/original'])![1]['users/ai03/meditationEntries/original']
    expect(payload.authorUid).toBe('ai03')
    expect(payload.mind).toBe('AI 03 기존 글 수정')
  })

  it('opens an older record, preserves its verse and cross picture, and immediately shows the saved edit', async () => {
    await openEdit()
    const memo = screen.getByRole('textbox', { name: /묵상 메모/ })
    expect((memo as HTMLTextAreaElement).value).toBe('수정 전 묵상')
    fireEvent.change(memo, { target: { value: '수정한 묵상 본문' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.update).toHaveBeenCalled())
    const payload = state.update.mock.calls.find(call => call[1]['users/owner/meditationEntries/original'])![1]['users/owner/meditationEntries/original']
    expect(payload.mind).toBe('수정한 묵상 본문')
    expect(payload.selectedVerseNumbers).toEqual([1])
    expect(payload.crossImage).toBe(image)
    expect(payload.authorUid).toBe('owner')
    expect(payload.activityId).toBe('ai01')
    await waitFor(() => expect(screen.queryByRole('heading', { name: '묵상 수정' })).toBeNull())
    expect(screen.getAllByText('수정한 묵상 본문').length).toBeGreaterThan(0)
  })
  it('keeps the editing draft visible when saving fails', async () => {
    await openEdit()
    state.update.mockRejectedValueOnce(new Error('저장 연결 실패'))
    fireEvent.change(screen.getByRole('textbox', { name: /묵상 메모/ }), { target: { value: '다시 저장할 묵상' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('저장 연결 실패'))
    expect((screen.getByRole('textbox', { name: /묵상 메모/ }) as HTMLTextAreaElement).value).toBe('다시 저장할 묵상')
  })
  it('uses the selected AI activity name for a new entry without changing the authenticated owner', async () => {
    state.entries = {}
    render(<MeditationApp activityId="ai03"/>)
    fireEvent.click(within(screen.getByRole('navigation', { name: 'MOA Faith' })).getByRole('button', { name: '묵상' }))
    fireEvent.click(screen.getByRole('button', { name: '묵상 쓰기' }))
    fireEvent.change(screen.getByRole('textbox', { name: /묵상 메모/ }), { target: { value: 'AI 03으로 쓴 묵상' } })
    fireEvent.click(screen.getByRole('button', { name: '나만 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(state.update).toHaveBeenCalled())
    const payload = state.update.mock.calls.find(call => call[1]['users/owner/meditationEntries/new-entry'])![1]['users/owner/meditationEntries/new-entry']
    expect(payload.authorUid).toBe('owner')
    expect(payload.activityId).toBe('ai03')
    expect(payload.authorName).toBe('AI 03')
    expect(state.user.uid).toBe('owner')
  })
})
