import { useEffect, useMemo, useState } from 'react'
import { appRegistry } from '../apps/registry'
import { AppGrid } from '../components/AppGrid'
import { AppUpdateBanner } from '../components/AppUpdateBanner'
import { useAppUpdate } from '../hooks/useAppUpdate'

export function AppShell() {
  const [activeRoute, setActiveRoute] = useState('')
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
      setActiveRoute(window.location.hash || '')
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function handleOpenApp(route: string) {
    window.location.hash = route.replace(/^#/, '')
  }

  if (ActiveAppComponent) {
    return (
      <main className="app-shell app-shell-subapp">
        {hasUpdate ? (
          <AppUpdateBanner
            isUpdating={isUpdating}
            onUpdate={() => void applyUpdate()}
          />
        ) : null}
        <ActiveAppComponent />
      </main>
    )
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
  )
}
