export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>
export const BEFORE_APP_UPDATE = 'moa-before-app-update'
export const UPDATE_LOCK = 'moa-update-lock'
export const UPDATE_UNLOCK = 'moa-update-unlock'
let availableUpdate: UpdateServiceWorker | null = null
export function getAvailableUpdate() { return availableUpdate }
export function offerAppUpdate(updateServiceWorker: UpdateServiceWorker | null) {
  availableUpdate = updateServiceWorker
  window.dispatchEvent(new CustomEvent('moa-update-available', { detail: { updateServiceWorker } }))
}
export function canApplyAppUpdate() { return window.dispatchEvent(new Event(BEFORE_APP_UPDATE, { cancelable: true })) }
