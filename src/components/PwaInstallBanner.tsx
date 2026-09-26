import type { PwaInstallStatus } from '../hooks/usePwaInstallPrompt'

type PwaInstallBannerProps = {
  canInstall: boolean
  onDismiss: () => void
  onInstall: () => void
  status: PwaInstallStatus
}

const installCopy: Record<PwaInstallStatus, { body: string; label: string }> = {
  checking: {
    body: 'Checking whether Chrome can install this PWA.',
    label: 'Checking',
  },
  ready: {
    body: 'Install MOA and launch it like a standalone app.',
    label: 'Install',
  },
  installing: {
    body: 'Chrome is opening the native install prompt.',
    label: 'Installing',
  },
  installed: {
    body: 'MOA is installed on this device.',
    label: 'Installed',
  },
  dismissed: {
    body: 'You can still install MOA later from Chrome.',
    label: 'Dismissed',
  },
  unavailable: {
    body: 'Use Chrome menu > Add to home screen or Install app.',
    label: 'Open menu',
  },
}

export function PwaInstallBanner({
  canInstall,
  onDismiss,
  onInstall,
  status,
}: PwaInstallBannerProps) {
  const copy = installCopy[status]
  const isInstallDisabled = !canInstall || status === 'installing'

  return (
    <aside className="install-banner" aria-label="Install MOA">
      <div>
        <strong>Install MOA</strong>
        <p>{copy.body}</p>
      </div>
      <div className="install-actions">
        <button
          className="install-primary"
          disabled={isInstallDisabled}
          type="button"
          onClick={onInstall}
        >
          {copy.label}
        </button>
        <button className="install-secondary" type="button" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </aside>
  )
}
