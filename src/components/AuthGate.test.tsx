// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthGate } from './AuthGate'

afterEach(cleanup)

function props() {
  return {
    authError: null as string | null,
    children: <p>로그인 완료</p>,
    isAuthLoading: false,
    isAuthMutating: false,
    onAiSignIn: vi.fn().mockResolvedValue(undefined),
    onEmailSignIn: vi.fn().mockResolvedValue(undefined),
    onSignIn: vi.fn().mockResolvedValue(undefined),
    user: null,
  }
}

function openEmailTab() {
  fireEvent.click(screen.getByRole('tab', { name: '이메일 로그인 (AI)' }))
}

describe('email login tab', () => {
  it('switches tabs with the keyboard and submits the entered credentials', async () => {
    const callbacks = props()
    render(<AuthGate {...callbacks} />)
    const googleTab = screen.getByRole('tab', { name: 'Google 로그인' })
    fireEvent.click(googleTab)
    expect(googleTab.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(googleTab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: '이메일 로그인 (AI)' }).getAttribute('aria-selected')).toBe('true')
    const submit = screen.getByRole('button', { name: '이메일로 로그인' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'ai01@moa-ai.app' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: ' password with spaces ' } })
    expect(screen.getByLabelText('비밀번호').getAttribute('type')).toBe('password')
    fireEvent.submit(screen.getByRole('form', { name: '이메일 로그인' }))
    await waitFor(() => expect(callbacks.onEmailSignIn).toHaveBeenCalledWith('ai01@moa-ai.app', ' password with spaces '))
    await waitFor(() => expect((screen.getByLabelText('비밀번호') as HTMLInputElement).value).toBe(''))
    expect(callbacks.onSignIn).not.toHaveBeenCalled()
  })

  it('disables duplicate submissions while awaiting login and allows retry after errors', async () => {
    const callbacks = props()
    let rejectLogin: (reason: Error) => void = () => {}
    callbacks.onEmailSignIn.mockImplementation(() => new Promise<void>((_, reject) => { rejectLogin = reject }))
    const { rerender } = render(<AuthGate {...callbacks} />)
    openEmailTab()
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'ai01@moa-ai.app' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong-password' } })
    fireEvent.submit(screen.getByRole('form', { name: '이메일 로그인' }))
    expect((screen.getByRole('button', { name: '로그인 중…' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.submit(screen.getByRole('form', { name: '이메일 로그인' }))
    expect(callbacks.onEmailSignIn).toHaveBeenCalledTimes(1)
    rejectLogin(new Error('Invalid credentials'))
    rerender(<AuthGate {...callbacks} authError="이메일 또는 비밀번호가 맞지 않습니다." />)
    await waitFor(() => expect((screen.getByRole('button', { name: '이메일로 로그인' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByRole('alert').textContent).toContain('비밀번호')
  })

  it('retains Google login and blocks email login when configuration is missing', () => {
    const callbacks = props()
    const { rerender } = render(<AuthGate {...callbacks} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Google 로그인' }))
    fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인 / 회원가입' }))
    expect(callbacks.onSignIn).toHaveBeenCalledOnce()
    rerender(<AuthGate {...callbacks} authError="Firebase configuration is missing: VITE_FIREBASE_API_KEY" />)
    openEmailTab()
    expect((screen.getByLabelText('이메일') as HTMLInputElement).disabled).toBe(true)
  })
})

describe('Ai city login-screen tab', () => {
  it('opens without signing in and returns to the login form', () => {
    const callbacks = props()
    render(<AuthGate {...callbacks} authError="Firebase configuration is missing: VITE_FIREBASE_API_KEY" />)
    expect(screen.getByRole('tab', { name: 'Ai city' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel', { name: 'Ai city' }).textContent).toContain('새로운 도시')
    expect(screen.queryByRole('button', { name: 'Google로 로그인 / 회원가입' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'AI 계정 빠른 로그인' })).toBeNull()
    expect(callbacks.onSignIn).not.toHaveBeenCalled()
    expect(callbacks.onAiSignIn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Google 로그인' }))
    expect(screen.getByRole('button', { name: 'Google로 로그인 / 회원가입' })).toBeTruthy()
  })

  it('supports keyboard navigation through all three tabs', () => {
    render(<AuthGate {...props()} />)
    const google = screen.getByRole('tab', { name: 'Google 로그인' })
    const city = screen.getByRole('tab', { name: 'Ai city' })
    fireEvent.keyDown(google, { key: 'End' })
    expect(city.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(city)
    fireEvent.keyDown(city, { key: 'ArrowRight' })
    expect(google.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(google, { key: 'ArrowLeft' })
    expect(city.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(city, { key: 'Home' })
    expect(google.getAttribute('aria-selected')).toBe('true')
  })
})
