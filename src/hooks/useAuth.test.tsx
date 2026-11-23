// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { FirebaseError } from 'firebase/app'
import { createUserWithEmailAndPassword,signInWithEmailAndPassword } from 'firebase/auth'
import { useAuth } from './useAuth'

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithEmailAndPassword: vi.fn(),createUserWithEmailAndPassword:vi.fn(),
  signInWithRedirect: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../services/authPersistence', () => ({ ensurePersistentAuth: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../services/firebase', () => ({
  getFirebaseAuth: () => ({ name: 'test-auth', authStateReady: async () => {} }),
  getFirebaseConfigError: () => null,
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('email authentication', () => {
  it('trims the email but preserves the password and uses Firebase email auth', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({} as Awaited<ReturnType<typeof signInWithEmailAndPassword>>)
    const { result } = renderHook(() => useAuth())
    await act(async () => { await result.current.signInWithEmail(' ai01@moa-ai.app ', ' pass ') })
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.objectContaining({ name: 'test-auth' }), 'ai01@moa-ai.app', ' pass ')
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

it('creates a persistent email account using the entered password unchanged',async()=>{
 vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({} as Awaited<ReturnType<typeof createUserWithEmailAndPassword>>)
 const {result}=renderHook(()=>useAuth())
 await act(async()=>{await result.current.createEmailAccount(' person@example.com ',' password ')})
 expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(),'person@example.com',' password ')
 expect(result.current.isAuthMutating).toBe(false)
})
it.each([['auth/email-already-in-use','이미 등록된'],['auth/weak-password','6자 이상']])('explains signup failure %s',async(code,message)=>{
 vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(new FirebaseError(code,'failed'))
 const {result}=renderHook(()=>useAuth())
 await act(async()=>{await expect(result.current.createEmailAccount('person@example.com','password')).rejects.toBeInstanceOf(FirebaseError)})
 expect(result.current.authError).toContain(message)
 expect(result.current.isAuthMutating).toBe(false)
})
