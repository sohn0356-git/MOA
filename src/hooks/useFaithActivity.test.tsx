// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; email: string } },
  primaryUser: { uid: 'google-owner' },
  callback: null as null | ((user: null | { uid: string; email: string }) => void),
  signIn: vi.fn(), signOut: vi.fn(), activate: vi.fn(),
}))
vi.mock('../services/faithSession', () => ({ getAiActivityAuth: () => mocks.auth, setFaithAiActivity: mocks.activate }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, callback: typeof mocks.callback) => { mocks.callback = callback; callback?.(mocks.auth.currentUser); return () => {} },
  signInWithEmailAndPassword: mocks.signIn, signOut: mocks.signOut,
}))
import { useFaithActivity } from './useFaithActivity'
beforeEach(() => {
  localStorage.clear(); mocks.auth.currentUser = null; mocks.callback = null; mocks.activate.mockReset()
  mocks.signIn.mockReset().mockImplementation(async (_auth: unknown, email: string) => {
    const user = { uid: email.split('@')[0], email }; mocks.auth.currentUser = user; mocks.callback?.(user); return { user }
  })
  mocks.signOut.mockReset().mockImplementation(async () => { mocks.auth.currentUser = null; mocks.callback?.(null) })
})
afterEach(cleanup)
describe('AI activity authorization', () => {
  it('obtains the AI UID permissions and switches between AI IDs while keeping Google untouched', async () => {
    const { result } = renderHook(() => useFaithActivity())
    await act(async () => { await result.current.selectActivity('ai03') })
    expect(mocks.signIn).toHaveBeenCalledWith(mocks.auth, 'ai03@moa-ai.app', expect.any(String))
    expect(result.current.activityId).toBe('ai03')
    expect(mocks.auth.currentUser?.uid).toBe('ai03')
    expect(mocks.activate).toHaveBeenLastCalledWith(true)
    await act(async () => { await result.current.selectActivity('ai07') })
    expect(result.current.activityId).toBe('ai07')
    expect(mocks.auth.currentUser?.uid).toBe('ai07')
    expect(mocks.primaryUser.uid).toBe('google-owner')
  })
  it('retains the working identity if switching permissions fails', async () => {
    const { result } = renderHook(() => useFaithActivity())
    await act(async () => { await result.current.selectActivity('ai02') })
    mocks.signIn.mockRejectedValueOnce(new Error('offline'))
    await act(async () => { await expect(result.current.selectActivity('ai05')).rejects.toThrow('offline') })
    expect(result.current.activityId).toBe('ai02')
    expect(mocks.auth.currentUser?.uid).toBe('ai02')
    expect(result.current.error).toContain('권한')
  })
  it('restores the earlier chosen AI as verified permissions and can return to the personal account', async () => {
    localStorage.setItem('moa.faith.activityId', 'ai04')
    const { result } = renderHook(() => useFaithActivity())
    await waitFor(() => expect(result.current.activityId).toBe('ai04'))
    await act(async () => { await result.current.clearActivity() })
    expect(mocks.signOut).toHaveBeenCalledWith(mocks.auth)
    expect(result.current.activityId).toBe('')
    expect(localStorage.getItem('moa.faith.activityId')).toBe('')
    expect(mocks.activate).toHaveBeenLastCalledWith(false)
    expect(mocks.primaryUser.uid).toBe('google-owner')
  })
  it('rejects a credential result whose UID does not match the chosen AI', async () => {
    mocks.signIn.mockResolvedValueOnce({ user: { uid: 'not-ai03', email: 'ai03@moa-ai.app' } })
    const { result } = renderHook(() => useFaithActivity())
    await act(async () => { await expect(result.current.selectActivity('ai03')).rejects.toThrow('권한') })
    expect(result.current.activityId).toBe('')
    expect(mocks.activate).not.toHaveBeenLastCalledWith(true)
  })
})
