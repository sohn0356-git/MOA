import { appRegistry } from '../apps/registry'
import { AppGrid } from '../components/AppGrid'

export function AppShell() {
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

      <section className="apps-section" aria-labelledby="apps-heading">
        <div className="section-heading">
          <h2 id="apps-heading">Apps</h2>
          <span>{appRegistry.length} installed</span>
        </div>
        <AppGrid apps={appRegistry} />
      </section>
    </main>
  )
}
