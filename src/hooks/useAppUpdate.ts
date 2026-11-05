import { useEffect, useRef, useState } from 'react'
import { canApplyAppUpdate, getAvailableUpdate, UPDATE_LOCK, UPDATE_UNLOCK, type UpdateServiceWorker } from '../lib/appUpdateProtocol'
export function useAppUpdate() {
  const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker | null>(() => getAvailableUpdate())
  const [applying, setApplying] = useState(false)
  const [locked, setLocked] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const pending = useRef(false)
  useEffect(() => {
    const available = (event: Event) => setUpdateServiceWorker(() => (event as CustomEvent<{ updateServiceWorker: UpdateServiceWorker | null }>).detail.updateServiceWorker)
    const lock = () => setLocked(true), unlock = () => setLocked(false)
    window.addEventListener('moa-update-available', available); window.addEventListener(UPDATE_LOCK, lock); window.addEventListener(UPDATE_UNLOCK, unlock)
    return () => { window.removeEventListener('moa-update-available', available); window.removeEventListener(UPDATE_LOCK, lock); window.removeEventListener(UPDATE_UNLOCK, unlock) }
  }, [])
  async function applyUpdate() {
    if (!updateServiceWorker || pending.current) return
    if (!canApplyAppUpdate()) { setUpdateError('작성 중인 묵상을 저장하거나 작성 화면을 닫은 뒤 업데이트해주세요.'); return }
    pending.current = true; setApplying(true); setUpdateError('')
    try { await updateServiceWorker(true) }
    catch (error) { setUpdateError(error instanceof Error ? error.message : '업데이트하지 못했습니다. 다시 시도해주세요.') }
    finally { pending.current = false; setApplying(false); setLocked(false) }
  }
  return { applyUpdate, hasUpdate: Boolean(updateServiceWorker), isUpdating: applying || locked, updateError }
}
