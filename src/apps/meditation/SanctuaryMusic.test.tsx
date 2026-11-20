// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {SanctuaryMusic} from './SanctuaryMusic'
import {SANCTUARY_CCM_URL} from './sanctuaryAudio'
beforeEach(()=>{vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{})})
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('streams the supplied M4A in a loop at low volume without a video or cross-origin fetch',()=>{
 const view=render(<SanctuaryMusic/>),node=view.container.querySelector('audio')!
 expect(node.src).toBe(SANCTUARY_CCM_URL);expect(node.loop).toBe(true);expect(node.volume).toBe(.2)
 expect(node.preload).toBe('none');expect(node.crossOrigin).toBeNull()
 expect(node.play).toHaveBeenCalledOnce();expect(view.container.querySelector('iframe')).toBeNull()
 fireEvent.playing(node)
 fireEvent.click(screen.getByRole('button',{name:'찬양 일시정지'}));expect(node.pause).toHaveBeenCalledOnce()
 fireEvent.pause(node)
 fireEvent.click(screen.getByRole('button',{name:'찬양 재생'}));expect(node.play).toHaveBeenCalledTimes(2)
 fireEvent.change(screen.getByRole('slider',{name:'찬양 음량'}),{target:{value:'35'}});expect(node.volume).toBe(.35)
 view.unmount();expect(node.pause).toHaveBeenCalledTimes(2);expect(node.load).toHaveBeenCalledOnce();expect(node.hasAttribute('src')).toBe(false)
})
it('allows a manual start if the browser blocks autoplay',async()=>{
 vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('blocked','NotAllowedError'))
 render(<SanctuaryMusic/>);await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('소리를 켜려면'))
 fireEvent.click(screen.getByRole('button',{name:'찬양 재생'}));expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
})
it('reconnects after a network error and replaces the source without retaining the previous stream',()=>{
 const view=render(<SanctuaryMusic/>),node=view.container.querySelector('audio')!
 fireEvent.error(node);expect(screen.getByRole('status')).toHaveTextContent('불러오지 못했어요')
 fireEvent.click(screen.getByRole('button',{name:'다시 연결'}));expect(node.load).toHaveBeenCalledOnce();expect(node.play).toHaveBeenCalledTimes(2)
 view.rerender(<SanctuaryMusic source="https://example.com/next.m4a"/>);expect(node.src).toBe('https://example.com/next.m4a');expect(node.pause).toHaveBeenCalledOnce();expect(node.play).toHaveBeenCalledTimes(3)
})
