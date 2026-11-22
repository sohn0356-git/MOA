const KEY = 'moa.launch.seen.v1'

export function shouldShowInitialLaunch() {
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined
  if (navigation?.type === 'reload' || navigation?.type === 'back_forward') return false
  try { return sessionStorage.getItem(KEY) !== '1' } catch { return true }
}

export function markLaunchSeen() {
  try { sessionStorage.setItem(KEY, '1') } catch { /* Reload detection still works when browser storage is unavailable. */ }
}
