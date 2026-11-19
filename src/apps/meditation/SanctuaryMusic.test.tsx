// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {SanctuaryMusic} from './SanctuaryMusic'
const tracks=[{id:'one',active:true,title:'찬양',artist:'',videoId:'abcdefghijk',youtubeUrl:''},{id:'two',active:true,title:'찬양 2',artist:'',videoId:'lmnopqrstuv',youtubeUrl:''}]
afterEach(()=>{cleanup();delete window.YT})
it('loops the registered playlist at a quiet volume, supports blocked autoplay, and stops on exit',async()=>{
 const target={setVolume:vi.fn(),playVideo:vi.fn(),pauseVideo:vi.fn(),destroy:vi.fn()}
 let options:any
 window.YT={Player:class{constructor(_node:HTMLElement,value:any){options=value;return target}} as any}
 const view=render(<SanctuaryMusic tracks={tracks}/>)
 await waitFor(()=>expect(options).toBeDefined())
 expect(options.playerVars).toMatchObject({loop:1,autoplay:1,playlist:'abcdefghijk,lmnopqrstuv',playsinline:1})
 act(()=>options.events.onReady({target}))
 expect(target.setVolume).toHaveBeenCalledWith(20);expect(target.playVideo).toHaveBeenCalledOnce()
 act(()=>options.events.onAutoplayBlocked())
 expect(screen.getByRole('status')).toHaveTextContent('찬양 재생')
 fireEvent.click(screen.getByRole('button',{name:'찬양 재생'}));expect(target.playVideo).toHaveBeenCalledTimes(2)
 act(()=>options.events.onStateChange({data:1}))
 fireEvent.click(screen.getByRole('button',{name:'찬양 일시정지'}));expect(target.pauseVideo).toHaveBeenCalledOnce()
 fireEvent.change(screen.getByRole('slider',{name:'찬양 음량'}),{target:{value:'35'}});expect(target.setVolume).toHaveBeenLastCalledWith(35)
 view.unmount();expect(target.destroy).toHaveBeenCalledOnce()
})
it('does not contact YouTube when no playable music is registered',()=>{
 const create=vi.spyOn(document,'createElement');render(<SanctuaryMusic tracks={[]}/>)
 expect(screen.getByText(/찬양 목록이 준비되면/)).toBeInTheDocument()
 expect(create.mock.calls.some(([tag])=>tag==='script')).toBe(false);create.mockRestore()
})
