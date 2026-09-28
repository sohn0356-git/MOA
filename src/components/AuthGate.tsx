import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'

type AuthGateProps = {
  authError: string | null
  children: ReactNode
  isAuthLoading: boolean
  isAuthMutating: boolean
  onSignIn: () => Promise<void>
  user: User | null
}

export function AuthGate({
  authError,
  children,
  isAuthLoading,
  isAuthMutating,
  onSignIn,
  user,
}: AuthGateProps) {
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
          <p>Google 계정으로 로그인하거나 가입한 뒤 앱을 사용할 수 있습니다.</p>
        </div>
        {authError ? <p className="app-error">{authError}</p> : null}
        <button
          className="google-login-button"
          disabled={isAuthMutating || Boolean(authError?.includes('configuration'))}
          type="button"
          onClick={() => void onSignIn()}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2Z" />
            <path d="M12 22c2.7 0 5-0.9 6.6-2.5l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
            <path d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6Z" />
            <path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2 10 10 0 0 0 3.1 7.6l3.3 2.6c.8-2.3 3-4.1 5.6-4.1Z" />
          </svg>
          <span>{isAuthMutating ? '로그인 중' : 'Google로 로그인 / 회원가입'}</span>
        </button>
      </section>
    </main>
  )
}
