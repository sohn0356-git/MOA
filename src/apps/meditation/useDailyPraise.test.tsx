// @vitest-environment jsdom
import {act,cleanup,renderHook,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {DAILY_PRAISE_KEY,normalizeLunchPraiseTracks,selectDailyPraise} from './dailyPraise'
import {useDailyPraise} from './useDailyPraise'
const tracks=normalizeLunchPraiseTracks({old:{videoId:'abcdefghijk'},older:{videoId:'lmnopqrstuv'},oldest:{videoId:'0123456789_'}})
beforeEach(()=>localStorage.clear())
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('waits for the library then saves and restores the same daily video across remounts',async()=>{
 const first=renderHook(({list,day})=>useDailyPraise(list,day),{initialProps:{list:[] as typeof tracks,day:'2026-11-19'}})
 expect(first.result.current).toBeNull();expect(localStorage.getItem(DAILY_PRAISE_KEY)).toBeNull()
 first.rerender({list:tracks,day:'2026-11-19'});await waitFor(()=>expect(localStorage.getItem(DAILY_PRAISE_KEY)).not.toBeNull())
 const id=first.result.current?.videoId;first.unmount()
 const restored=renderHook(()=>useDailyPraise([...tracks].reverse(),'2026-11-19'));expect(restored.result.current?.videoId).toBe(id)
})
it('retains the daily video while changing banks, and replaces it when disabled/removed',async()=>{
 localStorage.setItem(DAILY_PRAISE_KEY,JSON.stringify({day:'2026-11-19',videoId:tracks[0].videoId}))
 const view=renderHook(({list})=>useDailyPraise(list,'2026-11-19'),{initialProps:{list:tracks}})
 view.rerender({list:[...tracks,{...tracks[0],id:'new',videoId:'ZYXWVUTSRQP'}]});expect(view.result.current?.videoId).toBe(tracks[0].videoId)
 view.rerender({list:tracks.slice(1)});await waitFor(()=>expect(view.result.current?.videoId).not.toBe(tracks[0].videoId))
})
it('updates on the Korean-day key change even if the page stays open',async()=>{
 const view=renderHook(({day})=>useDailyPraise(tracks,day),{initialProps:{day:'2026-11-19'}})
 view.rerender({day:'2026-11-20'})
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(DAILY_PRAISE_KEY)!)).toEqual({day:'2026-11-20',videoId:selectDailyPraise(tracks,'2026-11-20')?.videoId}))
})
it('keeps working when storage is blocked or contains malformed data',()=>{
 localStorage.setItem(DAILY_PRAISE_KEY,'broken')
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked')})
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
 const view=renderHook(()=>useDailyPraise(tracks,'2026-11-19'))
 expect(view.result.current?.videoId).toBe(selectDailyPraise(tracks,'2026-11-19')?.videoId)
 act(()=>view.rerender());expect(view.result.current).not.toBeNull()
})
