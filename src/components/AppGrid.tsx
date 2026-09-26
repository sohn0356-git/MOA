import type { AppMeta } from '../types/app'

type AppGridProps = {
  apps: AppMeta[]
}

export function AppGrid({ apps }: AppGridProps) {
  if (apps.length === 0) {
    return <p className="empty-state">Your apps will appear here.</p>
  }

  return (
    <div className="app-grid">
      {apps.map((app) => {
        const Icon = app.icon

        return (
          <button
            className="app-tile"
            key={app.id}
            type="button"
            aria-label={`Open ${app.name}`}
          >
            <span className="app-icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="app-name">{app.name}</span>
            <span className="app-description">{app.description}</span>
          </button>
        )
      })}
    </div>
  )
}
