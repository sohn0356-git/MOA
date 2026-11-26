// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {NotificationPermissionIntro,NOTIFICATION_PERMISSION_INTRO_KEY,needsNotificationPermissionIntro} from './NotificationPermissionIntro'
const request=vi.fn().mockResolvedValue('granted')
beforeEach(()=>{localStorage.clear();sessionStorage.clear();request.mockReset().mockResolvedValue('granted');vi.stubGlobal('Notification',{permission:'default',requestPermission:request});HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('waits until the launch screen has finished and asks only after the allow button is clicked',async()=>{
 const view=render(<NotificationPermissionIntro ready={false}/>);expect(screen.queryByRole('dialog')).toBeNull();expect(request).not.toHaveBeenCalled()
 view.rerender(<NotificationPermissionIntro ready/>);expect(screen.getByRole('dialog',{name:'모아 알림을 허용할까요?'})).toBeInTheDocument();expect(request).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'알림 허용'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(request).toHaveBeenCalledOnce();expect(localStorage.getItem(NOTIFICATION_PERMISSION_INTRO_KEY)).toBe('1')
})
it('remembers later so refreshes and returning visits do not keep prompting',()=>{
 const view=render(<NotificationPermissionIntro ready/>);fireEvent.click(screen.getByRole('button',{name:'나중에'}));view.unmount();render(<NotificationPermissionIntro ready/>);expect(screen.queryByRole('dialog')).toBeNull();expect(request).not.toHaveBeenCalled()
})
it.each(['granted','denied'])('does not ask again when browser permission is %s',permission=>{
 vi.stubGlobal('Notification',{permission,requestPermission:request});render(<NotificationPermissionIntro ready/>);expect(screen.queryByRole('dialog')).toBeNull();expect(request).not.toHaveBeenCalled()
})
it('does not offer an unusable permission button in unsupported browsers',()=>{
 vi.stubGlobal('Notification',undefined);expect(needsNotificationPermissionIntro()).toBe(false)
})
it('keeps dismissal available when opening the device permission prompt fails',async()=>{
 request.mockRejectedValue(Error('blocked'));render(<NotificationPermissionIntro ready/>);fireEvent.click(screen.getByRole('button',{name:'알림 허용'}));expect(await screen.findByRole('alert')).toHaveTextContent('브라우저 설정');expect(localStorage.getItem(NOTIFICATION_PERMISSION_INTRO_KEY)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'나중에'}));expect(screen.queryByRole('dialog')).toBeNull()
})
