// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,render} from '@testing-library/react'
import {DevotionReminderRuntime} from './DevotionReminderRuntime'
const state=vi.hoisted(()=>({enabled:true,show:vi.fn().mockResolvedValue(undefined),activate:vi.fn().mockResolvedValue(undefined)}))
vi.mock('../apps/meditation/useDevotionReminders',()=>({REMINDER_PERMISSION_EVENT:'moa:notification-permission-granted',currentNotificationPermission:()=> 'granted',activateDevotionReminders:state.activate,useDevotionReminders:()=>({value:{enabled:state.enabled,reminders:[{id:'morning',enabled:true,time:'07:00',timezone:'Asia/Seoul',days:[4]},{id:'night',enabled:true,time:'08:00',timezone:'Asia/Seoul',days:[4]}]}})}))
vi.mock('../apps/meditation/reminderPush',()=>({enrollReminderPush:async()=>false}))
beforeEach(()=>{localStorage.clear();vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-25T21:59:59Z'));state.enabled=true;state.show.mockClear();state.activate.mockClear();Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{getRegistration:async()=>({showNotification:state.show})}})})
afterEach(()=>{cleanup();vi.useRealTimers();Reflect.deleteProperty(navigator,'serviceWorker')})
it('delivers each selected alarm once at its local minute, independently',async()=>{
 render(<DevotionReminderRuntime uid="alice"/>);await act(async()=>vi.advanceTimersByTime(1000));expect(state.show).toHaveBeenCalledTimes(1);await act(async()=>vi.advanceTimersByTime(20000));expect(state.show).toHaveBeenCalledTimes(1)
 vi.setSystemTime(new Date('2026-11-25T23:00:00Z'));await act(async()=>vi.advanceTimersByTime(1000));expect(state.show).toHaveBeenCalledTimes(2)
})
it('does not ring for a disabled channel and activates defaults on a permission grant',async()=>{
 state.enabled=false;render(<DevotionReminderRuntime uid="alice"/>);await act(async()=>vi.advanceTimersByTime(1000));expect(state.show).not.toHaveBeenCalled();act(()=>window.dispatchEvent(new Event('moa:notification-permission-granted')));expect(state.activate).toHaveBeenCalledWith('alice',true)
})
it('stops the previous account timer when logged out',async()=>{
 const view=render(<DevotionReminderRuntime uid="alice"/>);view.rerender(<DevotionReminderRuntime uid=""/>);await act(async()=>vi.advanceTimersByTime(1000));expect(state.show).not.toHaveBeenCalled()
})
