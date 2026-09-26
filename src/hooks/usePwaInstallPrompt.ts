import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type PwaInstallStatus =
  | 'checking'
  | 'ready'
  | 'installing'
  | 'installed'
  | 'dismissed'
  | 'unavailable'

function isStandaloneDisplay() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true
  )
}

export function usePwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplay)
  const [status, setStatus] = useState<PwaInstallStatus>(
    isStandaloneDisplay() ? 'installed' : 'checking',
  )
  const canInstall = Boolean(installPrompt) && !isInstalled

  useEffect(() => {
    const unavailableTimer = window.setTimeout(() => {
      setStatus((currentStatus) =>
        currentStatus === 'checking' ? 'unavailable' : currentStatus,
      )
    }, 2500)

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      setStatus('ready')
    }

    function handleAppInstalled() {
      setInstallPrompt(null)
      setIsInstalled(true)
      setStatus('installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.clearTimeout(unavailableTimer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!installPrompt) {
      return
    }

    setStatus('installing')
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)

    if (choice.outcome === 'accepted') {
      setStatus('installed')
      setIsInstalled(true)
      return
    }

    setStatus('dismissed')
  }

  function dismissInstallPrompt() {
    setInstallPrompt(null)
    setStatus('dismissed')
  }

  return {
    canInstall,
    dismissInstallPrompt,
    promptInstall,
    status,
  }
}
