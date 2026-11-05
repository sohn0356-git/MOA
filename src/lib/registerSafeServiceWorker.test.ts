// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { registerSafeServiceWorker } from './registerSafeServiceWorker'
import { BEFORE_APP_UPDATE, getAvailableUpdate, offerAppUpdate } from './appUpdateProtocol'
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); offerAppUpdate(null) })
it('detects a waiting deployment without activating it or reloading any tab', async () => {
  vi.useFakeTimers()
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete')
  const worker = { postMessage: vi.fn() }
  const registration = Object.assign(new EventTarget(), { waiting: worker, update: vi.fn().mockResolvedValue(undefined) })
  const serviceWorker = Object.assign(new EventTarget(), { controller: {}, register: vi.fn().mockResolvedValue(registration) })
  vi.stubGlobal('navigator', { serviceWorker })
  registerSafeServiceWorker()
  await Promise.resolve()
  expect(serviceWorker.register).toHaveBeenCalledWith(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL })
  expect(getAvailableUpdate()).toBeTypeOf('function')
  expect(worker.postMessage).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(120000)
  expect(registration.update).toHaveBeenCalledTimes(3)
  expect(worker.postMessage).not.toHaveBeenCalled()
  const reply = vi.fn()
  const block = (event: Event) => event.preventDefault()
  window.addEventListener(BEFORE_APP_UPDATE, block)
  serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'MOA_UPDATE_SAFETY' }, ports: [{ postMessage: reply } as unknown as MessagePort] }))
  expect(reply).toHaveBeenCalledWith({ safe: false })
  window.removeEventListener(BEFORE_APP_UPDATE, block)
})
