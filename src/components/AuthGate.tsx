import { useState, type ReactNode, type FormEvent } from 'react'
import './AuthGate.css'
import { AiCityApp } from '../apps/ai-city/AiCityApp'
import type { User } from 'firebase/auth'
import { aiLoginAccounts } from '../data/aiAccounts'

type AuthGateProps = {
  authError: string | null
  children: ReactNode
  isAuthLoading: boolean
  isAuthMutating: boolean
  onAiSignIn: (accountId: string) => Promise<void>
  onEmailSignIn: (email: string, password: string) => Promise<void>
  onSignIn: () => Promise<void>
  user: User | null
}

function isMissingLocalConfig(authError: string | null) {
  return Boolean(authError?.startsWith('Firebase configuration is missing:'))
}

export function AuthGate({
  authError,
  children,
  isAuthLoading,
  isAuthMutating,
  onAiSignIn,
  onEmailSignIn,
  onSignIn,
  user,
}: AuthGateProps) {
  const [loginTab, setLoginTab] = useState<'google' | 'email' | 'ai-city'>('google')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loginDisabled = isAuthMutating || isSubmitting || isMissingLocalConfig(authError)

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loginDisabled || !email.trim() || !password) return
    setIsSubmitting(true)
    try {
      await onEmailSignIn(email.trim(), password)
      setPassword('')
    } catch {
      // The auth hook displays the error while the form stays available to retry.
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthLoading) {
    return (
      <main className="auth-screen">
        <section className="auth-panel" aria-label="로그인 확인 중">
          <div className="brand-mark" aria-hidden="true">
            M
          </div>
          <h1>MOA</h1>
          <p>로그인 상태를 확인하는 중입니다.</p>
        </section>
      </main>
    )
  }

  if (user) {
    return children
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-label="로그인">
        <div className="brand-mark" aria-hidden="true">
          M
        </div>
        <div>
          <h1>MOA</h1>
          <p>Google 계정 또는 AI 계정의 이메일과 비밀번호로 로그인하세요.</p>
        </div>
        {authError ? <p className="app-error" role="alert">{authError}</p> : null}
        <div className="auth-tabs" role="tablist" aria-label="로그인 및 앱">
          {(['google', 'email', 'ai-city'] as const).map((tab) => (
            <button
              aria-controls={`auth-panel-${tab}`}
              aria-selected={loginTab === tab}
              id={`auth-tab-${tab}`}
              key={tab}
              role="tab"
              tabIndex={loginTab === tab ? 0 : -1}
              type="button"
              onClick={() => setLoginTab(tab)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const tabs = ['google', 'email', 'ai-city'] as const
                const index = tabs.indexOf(tab)
                const nextTab = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[2] : tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]
                setLoginTab(nextTab)
                document.getElementById(`auth-tab-${nextTab}`)?.focus()
              }}
            >
              {tab === 'google' ? 'Google 로그인' : tab === 'email' ? '이메일 로그인 (AI)' : 'Ai city'}
            </button>
          ))}
        </div>
        <div id="auth-panel-google" role="tabpanel" aria-labelledby="auth-tab-google" hidden={loginTab !== 'google'}>
        <button
          className="google-login-button"
          disabled={loginDisabled}
          type="button"
          onClick={() => void onSignIn().catch(() => {})}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2Z" />
            <path d="M12 22c2.7 0 5-0.9 6.6-2.5l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
            <path d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6Z" />
            <path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2 10 10 0 0 0 3.1 7.6l3.3 2.6c.8-2.3 3-4.1 5.6-4.1Z" />
          </svg>
          <span>{isAuthMutating ? '로그인 중' : 'Google로 로그인 / 회원가입'}</span>
        </button>
        </div>
        <div id="auth-panel-email" role="tabpanel" aria-labelledby="auth-tab-email" hidden={loginTab !== 'email'}>
          <form className="auth-email-form" aria-label="이메일 로그인" onSubmit={(event) => void handleEmailSubmit(event)}>
            <p>AI 계정의 이메일과 비밀번호를 입력해 주세요.</p>
            <label htmlFor="auth-email">이메일</label>
            <input autoComplete="username" disabled={loginDisabled} id="auth-email" name="email"
              onChange={(event) => setEmail(event.target.value)} placeholder="ai01@moa-ai.app" required type="email" value={email} />
            <label htmlFor="auth-password">비밀번호</label>
            <input autoComplete="current-password" disabled={loginDisabled} id="auth-password" name="password"
              onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            <button className="auth-email-submit" disabled={loginDisabled || !email.trim() || !password} type="submit">
              {isAuthMutating || isSubmitting ? '로그인 중…' : '이메일로 로그인'}
            </button>
          </form>

        </div>
        <div id="auth-panel-ai-city" role="tabpanel" aria-labelledby="auth-tab-ai-city" hidden={loginTab !== 'ai-city'}>
          {loginTab === 'ai-city' ? <AiCityApp embedded /> : null}
        </div>
        <section aria-label="AI 계정 빠른 로그인" hidden={loginTab === 'ai-city'}>
          <p>AI 계정 바로 로그인</p>
        <div className="ai-login-list" aria-label="AI 계정 로그인">
          {aiLoginAccounts.map((account) => (
            <button
              className="ai-login-button"
              disabled={loginDisabled}
              key={account.email}
              type="button"
              onClick={() => void onAiSignIn(account.accountId).catch(() => {})}
            >
              <span>{account.displayName}</span>
              <small>AI 로그인</small>
            </button>
          ))}
        </div>
        </section>
      </section>
    </main>
  )
}

