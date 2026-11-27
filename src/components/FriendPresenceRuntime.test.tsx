// @vitest-environment jsdom
import {render,cleanup,act,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FriendPresenceRuntime,stopAppPresence} from './FriendPresenceRuntime'
const state=vi.hoisted(()=>({write:vi.fn().mockResolvedValue(undefined),remove:vi.fn().mockResolvedValue(undefined),disconnect:vi.fn().mockResolvedValue(undefined),connected:null as null|((s:{val:()=>unknown})=>void),count:0}))
vi.mock('../services/faithSession',()=>({getFaithAuth:()=>({currentUser:{uid:'alice'}}),getFaithDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,path:string)=>path,push:(path:string)=>path+'/'+(++state.count),serverTimestamp:()=>123,set:state.write,remove:state.remove,onDisconnect:()=>({remove:state.disconnect}),onValue:(_path:string,callback:(s:{val:()=>unknown})=>void)=>{state.connected=callback;callback({val:()=>true});return()=>{state.connected=null}}}))
beforeEach(()=>{state.count=0;state.write.mockClear();state.remove.mockClear();state.disconnect.mockClear()})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
it('registers disconnect cleanup before announcing and removes the session before logout',async()=>{
 render(<FriendPresenceRuntime uid="alice"/>);await waitFor(()=>expect(state.write).toHaveBeenCalledWith('appPresence/alice/1',123));expect(state.disconnect).toHaveBeenCalledOnce();expect(state.disconnect.mock.invocationCallOrder[0]).toBeLessThan(state.write.mock.invocationCallOrder[0]);await act(async()=>stopAppPresence('alice'));expect(state.remove).toHaveBeenCalledWith('appPresence/alice/1');act(()=>state.connected?.({val:()=>true}));expect(state.write).toHaveBeenCalledTimes(1)
})
it('reconnects using a separate session and cleans it on unmount',async()=>{
 const view=render(<FriendPresenceRuntime uid="alice"/>);await waitFor(()=>expect(state.write).toHaveBeenCalledTimes(1));await act(async()=>{state.connected?.({val:()=>false});state.connected?.({val:()=>true})});expect(state.write).toHaveBeenCalledWith('appPresence/alice/2',123);view.unmount();expect(state.remove).toHaveBeenCalledWith('appPresence/alice/2')
})
it('refreshes active sessions and removes backgrounded sessions until the app becomes visible again',async()=>{
 vi.useFakeTimers();await act(async()=>{render(<FriendPresenceRuntime uid="alice"/>)});expect(state.write).toHaveBeenCalledTimes(1);await act(async()=>vi.advanceTimersByTime(30000));expect(state.write).toHaveBeenCalledTimes(2);const visibility=vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');await act(async()=>document.dispatchEvent(new Event('visibilitychange')));expect(state.remove).toHaveBeenCalledWith('appPresence/alice/1');await act(async()=>vi.advanceTimersByTime(30000));expect(state.write).toHaveBeenCalledTimes(2);visibility.mockReturnValue('visible');await act(async()=>document.dispatchEvent(new Event('visibilitychange')));expect(state.write).toHaveBeenCalledWith('appPresence/alice/2',123);vi.useRealTimers()
})
