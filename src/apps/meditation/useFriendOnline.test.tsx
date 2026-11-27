// @vitest-environment jsdom
import {act,renderHook,cleanup} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {hasLiveConnection,useFriendOnline} from './useFriendOnline'
const callbacks=vi.hoisted(()=>new Map<string,(s:{val:()=>unknown})=>void>())
vi.mock('../../services/faithSession',()=>({getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,path:string)=>path,onValue:(path:string,callback:(s:{val:()=>unknown})=>void)=>{callbacks.set(path,callback);callback({val:()=>null});return()=>callbacks.delete(path)}}))
afterEach(()=>{cleanup();callbacks.clear();vi.useRealTimers()})
it('considers fresh sessions online and expires stale sessions across multiple devices',()=>{
 const now=100000;expect(hasLiveConnection({phone:now,desktop:1},now)).toBe(true);expect(hasLiveConnection({desktop:1},now)).toBe(false);expect(hasLiveConnection(null,now)).toBe(false);expect(hasLiveConnection({future:now+20000},now)).toBe(false)
})
it('updates friend presence live, expires it, and stops reading removed friends',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-27T00:00:00Z'));const view=renderHook(({ids})=>useFriendOnline(ids),{initialProps:{ids:['bob']}});expect(view.result.current.bob).toBe(false);act(()=>callbacks.get('appPresence/bob')?.({val:()=>({phone:Date.now(),desktop:Date.now()})}));expect(view.result.current.bob).toBe(true);act(()=>callbacks.get('appPresence/bob')?.({val:()=>({desktop:Date.now()})}));expect(view.result.current.bob).toBe(true);act(()=>vi.advanceTimersByTime(90001));expect(view.result.current.bob).toBe(false);view.rerender({ids:[]});expect(callbacks.has('appPresence/bob')).toBe(false)
})
