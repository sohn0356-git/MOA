import { useEffect, useMemo, useState } from 'react'
import { appRegistry } from '../apps/registry'
import { AppGrid } from '../components/AppGrid'
import { PwaInstallBanner } from '../components/PwaInstallBanner'
import { usePwaInstallPrompt } from '../hooks/usePwaInstallPrompt'

function getRouteFromHash() {
  return window.location.hash || ''
}

export function AppShell() {
  const [activeRoute, setActiveRoute] = useState(getRouteFromHash)
  const { canInstall, dismissInstallPrompt, promptInstall } = usePwaInstallPrompt()
  const activeApp = useMemo(
    () => appRegistry.find((app) => app.route === activeRoute),
    [activeRoute],
  )
  const ActiveAppComponent = activeApp?.component

  useEffect(() => {
    function handleHashChange() {
      setActiveRoute(getRouteFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function handleOpenApp(route: string) {
    window.location.hash = route.replace(/^#/, '')
  }

  function handleBackHome() {
    history.pushState('', document.title, window.location.pathname + window.location.search)
    setActiveRoute('')
  }

  return (
    <main className="app-shell">
      <header className="brand-header">
        <div className="brand-mark" aria-hidden="true">
          M
        </div>
        <div>
          <h1>MOA</h1>
          <p>My Own Apps</p>
        </div>
      </header>

      {canInstall ? (
        <PwaInstallBanner
          onDismiss={dismissInstallPrompt}
          onInstall={() => void promptInstall()}
        />
      ) : null}

      {ActiveAppComponent ? (
        <>
          <button className="back-button" type="button" onClick={handleBackHome}>
            Back to apps
          </button>
          <ActiveAppComponent />
        </>
      ) : (
        <section className="apps-section" aria-labelledby="apps-heading">
          <div className="section-heading">
            <h2 id="apps-heading">Apps</h2>
            <span>{appRegistry.length} installed</span>
          </div>
          <AppGrid apps={appRegistry} onOpenApp={handleOpenApp} />
        </section>
      )}
    </main>
  )
}
