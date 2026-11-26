/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'
declare let self: ServiceWorkerGlobalScope
cleanupOutdatedCaches()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/MOA/index.html')))

// Do not skip waiting on install, honor legacy automatic SKIP_WAITING requests,
// or navigate every open client. All three previously caused lost editor state.
function ready(client: Client): Promise<boolean> {
  return new Promise(resolve => {
    const channel = new MessageChannel()
    const finish = (safe: boolean) => { clearTimeout(timer); channel.port1.close(); resolve(safe) }
    const timer = setTimeout(() => finish(false), 1500)
    channel.port1.onmessage = event => finish(event.data?.safe === true)
    try { client.postMessage({ type: 'MOA_UPDATE_SAFETY' }, [channel.port2]) } catch { finish(false) }
  })
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'MOA_APPLY_UPDATE') return
  event.waitUntil((async () => {
    const clients = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .filter(client => new URL(client.url).pathname.startsWith('/MOA/'))
    const checks = await Promise.all(clients.map(ready))
    if (!checks.every(Boolean)) {
      clients.forEach(client => client.postMessage({ type: 'MOA_UPDATE_RELEASE' }))
      event.ports[0]?.postMessage({ ok: false })
      return
    }
    event.ports[0]?.postMessage({ ok: true })
    await self.skipWaiting()
  })())
})

self.addEventListener('push',event=>{
 let notice:{title?:string;body?:string;tag?:string;url?:string}
 try{notice=event.data?.json()||{}}catch{notice={body:event.data?.text()}}
 event.waitUntil(self.registration.showNotification(notice.title||'MOA',{body:notice.body||'새로운 소식이 도착했어요.',icon:'/MOA/icons/chapel-v1-192.png',badge:'/MOA/icons/chapel-v1-192.png',tag:notice.tag,data:{url:'/MOA/'}}))
})
self.addEventListener('notificationclick',event=>{
 event.notification.close()
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(w=>new URL(w.url).origin===self.location.origin&&new URL(w.url).pathname.startsWith('/MOA/'));if(existing)return (existing as WindowClient).focus();return self.clients.openWindow('/MOA/')})())
})
