// @vitest-environment jsdom
import {beforeEach,expect,it,vi,afterEach} from 'vitest'
import {readPublicFeedCache,writePublicFeedCache} from './publicFeedCache'
beforeEach(()=>localStorage.clear())
afterEach(()=>vi.useRealTimers())
it('restores public photos immediately, replaces deleted photos and expires old snapshots',()=>{
 vi.useFakeTimers()
 const photos=[{id:'public',caption:'공개 묵상',imageUrl:'/photo.jpg'}]
 writePublicFeedCache(photos)
 expect(readPublicFeedCache()).toEqual(photos)
 writePublicFeedCache([])
 expect(readPublicFeedCache()).toEqual([])
 writePublicFeedCache(photos)
 vi.advanceTimersByTime(6*60*60*1000+1)
 expect(readPublicFeedCache()).toEqual([])
})
it('ignores corrupt cache records',()=>{
 localStorage.setItem('moa.public-feed.v1','broken')
 expect(readPublicFeedCache()).toEqual([])
 localStorage.setItem('moa.public-feed.v1',JSON.stringify({savedAt:Date.now(),photos:[null,{id:'invalid'}]}))
 expect(readPublicFeedCache()).toEqual([])
})
