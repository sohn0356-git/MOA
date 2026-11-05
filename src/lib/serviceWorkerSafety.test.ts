// @vitest-environment node
import { MessageChannel } from 'node:worker_threads'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('workbox-precaching', () => ({ cleanupOutdatedCaches: vi.fn(), precacheAndRoute: vi.fn(), createHandlerBoundToURL: vi.fn() }))
vi.mock('workbox-routing', () => ({ NavigationRoute: vi.fn(), registerRoute: vi.fn() }))
vi.mock('workbox-core', () => ({ clientsClaim: vi.fn() }))
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
async function setup(safe: boolean) {
  const client = { url: 'https://example.com/MOA/', postMessage: vi.fn((_message, ports) => ports?.[0]?.postMessage({ safe })) }
  let listener: (event: { data: { type: string }; waitUntil: (promise: Promise<unknown>) => void; ports: { postMessage: ReturnType<typeof vi.fn> }[] }) => void = () => {}
  const worker = { __WB_MANIFEST: [], clients: { matchAll: vi.fn().mockResolvedValue([client]) }, skipWaiting: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn((type, callback) => { if (type === 'message') listener = callback }) }
  vi.stubGlobal('self', worker); vi.stubGlobal('MessageChannel', MessageChannel)
  await import('../sw')
  return { worker, client, message(type: string) {
    let work = Promise.resolve()
    const reply = vi.fn()
    listener({ data: { type }, waitUntil: promise => { work = promise.then(() => {}) }, ports: [{ postMessage: reply }] })
    return { reply, work }
  } }
}
it('does not skip waiting on install or a legacy automatic SKIP_WAITING request', async () => {
 const api = await setup(true)
 expect(api.worker.skipWaiting).not.toHaveBeenCalled()
 await api.message('SKIP_WAITING').work
 expect(api.worker.skipWaiting).not.toHaveBeenCalled()
})
it('refuses activation when a writing tab reports unsafe', async () => {
 const api = await setup(false)
 const request = api.message('MOA_APPLY_UPDATE')
 await request.work
 expect(api.worker.skipWaiting).not.toHaveBeenCalled()
 expect(request.reply).toHaveBeenCalledWith({ ok: false })
 expect(api.client.postMessage).toHaveBeenCalledWith({ type: 'MOA_UPDATE_RELEASE' })
})
it('activates only after explicit request and every tab confirms safety', async () => {
 const api = await setup(true)
 const request = api.message('MOA_APPLY_UPDATE')
 await request.work
 expect(request.reply).toHaveBeenCalledWith({ ok: true })
 expect(api.worker.skipWaiting).toHaveBeenCalledTimes(1)
})
