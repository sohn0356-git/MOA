import { canApplyAppUpdate, offerAppUpdate, UPDATE_LOCK, UPDATE_UNLOCK } from './appUpdateProtocol'

export function registerSafeServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  let unlockTimer: ReturnType<typeof setTimeout> | undefined
  const unlock = () => { clearTimeout(unlockTimer); window.dispatchEvent(new Event(UPDATE_UNLOCK)) }
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'MOA_UPDATE_SAFETY') {
      const safe = canApplyAppUpdate()
      if (safe) {
        window.dispatchEvent(new Event(UPDATE_LOCK))
        clearTimeout(unlockTimer); unlockTimer = setTimeout(unlock, 30000)
      }
      event.ports[0]?.postMessage({ safe })
    }
    if (event.data?.type === 'MOA_UPDATE_RELEASE') unlock()
  })
  // A peer's update may offer a reload, but must never trigger one.
  let alreadyControlled = Boolean(navigator.serviceWorker.controller)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    unlock()
    if (alreadyControlled) offerAppUpdate(async () => {
      if (!canApplyAppUpdate()) throw new Error('작성 중인 내용을 마친 뒤 업데이트해주세요.')
      window.location.reload()
    })
    alreadyControlled = true
  })
  const register = async () => {
    const registration = await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL })
    const announce = () => offerAppUpdate(async () => {
      if (!canApplyAppUpdate()) throw new Error('작성 중인 내용을 마친 뒤 업데이트해주세요.')
      const waiting = registration.waiting
      if (!waiting) throw new Error('업데이트를 준비 중입니다. 잠시 후 다시 시도해주세요.')
      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel()
        let approved = false, controlled = false
        const finish = (error?: Error) => {
          clearTimeout(timer); channel.port1.close()
          navigator.serviceWorker.removeEventListener('controllerchange', changed)
          if (error) reject(error); else resolve()
        }
        const changed = () => { controlled = true; if (approved) finish() }
        const timer = setTimeout(() => finish(new Error('업데이트 응답이 늦습니다. 다시 시도해주세요.')), 30000)
        navigator.serviceWorker.addEventListener('controllerchange', changed)
        channel.port1.onmessage = event => {
          if (!event.data?.ok) { finish(new Error('작성 중이거나 이전 버전인 MOA 탭이 있습니다. 내용을 저장하고 다른 탭을 닫은 뒤 다시 시도해주세요.')); return }
          approved = true
          if (controlled) finish()
        }
        waiting.postMessage({ type: 'MOA_APPLY_UPDATE' }, [channel.port2])
      })
      // Only the tab whose user explicitly applied the update reloads.
      window.location.reload()
    })
    if (registration.waiting) announce()
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) announce()
      })
    })
    void registration.update().catch(() => {})
    window.setInterval(() => { void registration.update().catch(() => {}) }, 60000)
  }
  if (document.readyState === 'complete') void register().catch(() => {})
  else window.addEventListener('load', () => { void register().catch(() => {}) }, { once: true })
}
