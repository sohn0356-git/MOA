// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { FirebaseError } from 'firebase/app'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useAuth } from './useAuth'

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithEmailAndPassword: vi.fn(),
  signInWithRedirect: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../services/firebase', () => ({
  getFirebaseAuth: () => ({ name: 'test-auth' }),
  getFirebaseConfigError: () => null,
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('email authentication', () => {
  it('trims the email but preserves the password and uses Firebase email auth', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({} as Awaited<ReturnType<typeof signInWithEmailAndPassword>>)
    const { result } = renderHook(() => useAuth())
    await act(async () => { await result.current.signInWithEmail(' ai01@moa-ai.app ', ' pass ') })
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith({ name: 'test-auth' }, 'ai01@moa-ai.app', ' pass ')
    expect(result.current.isAuthMutating).toBe(false)
  })

  it('exposes a readable credentials error and resets loading on failure', async () => {
    const error = new FirebaseError('auth/invalid-credential', 'Invalid credentials')
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(error)
    const { result } = renderHook(() => useAuth())
    await act(async () => { await expect(result.current.signInWithEmail('ai01@moa-ai.app', 'wrong')).rejects.toBe(error) })
    expect(result.current.authError).toContain('이메일 또는 비밀번호')
    expect(result.current.isAuthMutating).toBe(false)
  })
})
