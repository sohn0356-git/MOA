import { MeditationApp } from '../apps/meditation/MeditationApp'
import { aiLoginAccounts } from '../data/aiAccounts'
import './FaithEntry.css'
import { AiCityApp } from '../apps/ai-city/AiCityApp'
import { useEffect, useMemo, useState } from 'react'
import { appRegistry } from '../apps/registry'
import { AppGrid } from '../components/AppGrid'
import { AuthGate } from '../components/AuthGate'
import { AppUpdateBanner } from '../components/AppUpdateBanner'
import { useAuth } from '../hooks/useAuth'
import { useAppUpdate } from '../hooks/useAppUpdate'

function entryRoute() {
  const hash = window.location.hash
  return !hash || hash === '#' || hash === '#/' ? '#/meditation' : hash
}

export function AppShell() {
  const [activeRoute, setActiveRoute] = useState(entryRoute)
  const [activityId, setActivityId] = useState(() => {
    try { const saved = localStorage.getItem('moa.faith.activityId') || ''; return aiLoginAccounts.some(account => account.accountId === saved) ? saved : '' } catch { return '' }
  })
  const {
    authError,
    isAuthLoading,
    isAuthMutating,
    signInWithAiAccount,
    signInWithEmail,
    signInWithGoogle,
    signOutUser,
    user,
  } = useAuth()
  const { applyUpdate, hasUpdate, isUpdating } = useAppUpdate()
  const activeApp = useMemo(() => {
    if (activeRoute.startsWith('#/home/')) {
      return appRegistry.find((app) => app.id === 'mini-room')
    }

    return appRegistry.find((app) => app.route === activeRoute)
  }, [activeRoute])
  const ActiveAppComponent = activeApp?.component

  useEffect(() => {
    function handleHashChange() {
      setActiveRoute(entryRoute())
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function handleOpenApp(route: string) {
    window.location.hash = route.replace(/^#/, '')
  }

  const authProps = {
    authError, isAuthLoading, isAuthMutating, user,
    onAiSignIn: signInWithAiAccount,
    onEmailSignIn: signInWithEmail,
    onSignIn: signInWithGoogle,
  }
  const isCityRoute = !activeRoute || activeRoute === '#' || activeRoute === '#/' || activeRoute === '#/ai-city'

  if (activeRoute === '#/meditation') {
    return (
      <main className="app-shell app-shell-subapp app-shell-faith" aria-label="MOA Faith 메인">
        {hasUpdate ? <AppUpdateBanner isUpdating={isUpdating} onUpdate={() => void applyUpdate()} /> : null}
        {authError ? <p className="faith-entry-error" role="alert">{authError}</p> : null}
        <MeditationApp activityId={activityId} entryActions={
          (
            <div className="faith-entry-account">
              <label className="faith-entry-label" htmlFor="faith-ai-account">활동 아이디</label>
              <select
                id="faith-ai-account"
                aria-label="활동 아이디 선택"
                value={activityId}
                onChange={event => {
                  const next = event.currentTarget.value
                  setActivityId(next)
                  try { localStorage.setItem('moa.faith.activityId', next) } catch { /* The selected identity remains available for this visit. */ }
                }}
              >
                <option value="">내 아이디</option>
                {aiLoginAccounts.map(account => <option key={account.accountId} value={account.accountId}>{account.displayName}</option>)}
              </select>
              {user ? <button className="faith-entry-google" type="button" disabled={isAuthMutating} onClick={() => void signOutUser().catch(() => {})}>로그아웃</button> : <button
                className="faith-entry-google"
                type="button"
                disabled={isAuthLoading || isAuthMutating || Boolean(authError?.startsWith('Firebase configuration is missing:'))}
                onClick={() => void signInWithGoogle().catch(() => {})}
              >
                <span aria-hidden="true" className="faith-entry-google-mark">G</span>
                <span>구글 로그인</span>
              </button>}
            </div>
          )
        } />
      </main>
    )
  }

  if (isCityRoute) {
    return (
      <main className="city-main-app" aria-label="AI City 메인">
        {hasUpdate ? <AppUpdateBanner isUpdating={isUpdating} onUpdate={() => void applyUpdate()} /> : null}
        <AiCityApp embedded entryActions={
          <nav className="city-entry-actions" aria-label="계정 및 MOA 앱">
            <a href="#/login">{user ? '계정' : '로그인'}</a>
            <a href="#/apps">MOA 앱 ↗</a>
          </nav>
        } />
      </main>
    )
  }

  if (activeRoute === '#/login') {
    return (
      <AuthGate {...authProps}>
        <main className="auth-screen">
          <section className="auth-panel" aria-label="내 계정">
            <h1>내 계정</h1>
            <p>{user?.displayName || user?.email || 'MOA'} 계정으로 로그인되어 있습니다.</p>
            <a className="back-button" href="#/ai-city">AI City로 돌아가기</a>
            <a className="back-button" href="#/apps">MOA 앱 열기</a>
            <button className="logout-button" disabled={isAuthMutating} type="button" onClick={() => void signOutUser()}>로그아웃</button>
          </section>
        </main>
      </AuthGate>
    )
  }

  if (ActiveAppComponent) {
    return (
      <AuthGate
        authError={authError}
        isAuthLoading={isAuthLoading}
        isAuthMutating={isAuthMutating}
        user={user}
        onAiSignIn={signInWithAiAccount}
        onEmailSignIn={signInWithEmail}
        onSignIn={signInWithGoogle}
      >
        <main className={`app-shell app-shell-subapp ${activeApp.id === 'mini-room' ? 'app-shell-minihome' : ''} ${activeApp.id === 'meditation' ? 'app-shell-faith' : ''}`}>
          {hasUpdate ? (
            <AppUpdateBanner
              isUpdating={isUpdating}
              onUpdate={() => void applyUpdate()}
            />
          ) : null}
          <ActiveAppComponent />
        </main>
      </AuthGate>
    )
  }

  return (
    <AuthGate
      authError={authError}
      isAuthLoading={isAuthLoading}
      isAuthMutating={isAuthMutating}
      user={user}
      onAiSignIn={signInWithAiAccount}
        onEmailSignIn={signInWithEmail}
      onSignIn={signInWithGoogle}
    >
      <main className="app-shell">
        <a className="back-button moa-city-return" href="#/ai-city">← AI City로 돌아가기</a>
        <header className="brand-header">
          <div className="brand-mark" aria-hidden="true">
            M
          </div>
          <div>
            <h1>MOA</h1>
            <p>My Own Apps</p>
          </div>
          <button
            className="logout-button"
            disabled={isAuthMutating}
            type="button"
            onClick={() => void signOutUser()}
          >
            로그아웃
          </button>
        </header>

        {hasUpdate ? (
          <AppUpdateBanner
            isUpdating={isUpdating}
            onUpdate={() => void applyUpdate()}
          />
        ) : null}

        <section className="apps-section" aria-labelledby="apps-heading">
          <div className="section-heading">
            <h2 id="apps-heading">Apps</h2>
            <span>{appRegistry.length} installed</span>
          </div>
          <AppGrid apps={appRegistry} onOpenApp={handleOpenApp} />
        </section>
      </main>
    </AuthGate>
  )
}

