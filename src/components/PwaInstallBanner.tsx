type PwaInstallBannerProps = {
  onDismiss: () => void
  onInstall: () => void
}

export function PwaInstallBanner({
  onDismiss,
  onInstall,
}: PwaInstallBannerProps) {
  return (
    <aside className="install-banner" aria-label="Install MOA">
      <div>
        <strong>Install MOA</strong>
        <p>Open MOA as a standalone app from Chrome.</p>
      </div>
      <div className="install-actions">
        <button className="install-primary" type="button" onClick={onInstall}>
          Install
        </button>
        <button className="install-secondary" type="button" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </aside>
  )
}
