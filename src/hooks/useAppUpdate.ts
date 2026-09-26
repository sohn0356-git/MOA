import { useEffect, useState } from 'react'

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

type AppUpdateEvent = CustomEvent<{
  updateServiceWorker: UpdateServiceWorker
}>

export function useAppUpdate() {
  const [updateServiceWorker, setUpdateServiceWorker] =
    useState<UpdateServiceWorker | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const hasUpdate = Boolean(updateServiceWorker)

  useEffect(() => {
    function handleUpdateAvailable(event: Event) {
      const updateEvent = event as AppUpdateEvent
      setUpdateServiceWorker(() => updateEvent.detail.updateServiceWorker)
    }

    window.addEventListener('moa-update-available', handleUpdateAvailable)
    return () =>
      window.removeEventListener('moa-update-available', handleUpdateAvailable)
  }, [])

  async function applyUpdate() {
    if (!updateServiceWorker) {
      return
    }

    setIsUpdating(true)
    await updateServiceWorker(true)
  }

  return {
    applyUpdate,
    hasUpdate,
    isUpdating,
  }
}
