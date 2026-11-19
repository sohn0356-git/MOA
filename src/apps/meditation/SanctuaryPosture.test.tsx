// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,renderHook,screen} from '@testing-library/react'
import {SanctuaryScene} from './SanctuaryScene'
import {useSanctuaryMovement} from './useSanctuaryMovement'
import {sanctuarySpawn,sanctuaryPrayerBoxPoint} from './sanctuaryMovement'
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>window.setTimeout(()=>fn(performance.now()),16));vi.stubGlobal('cancelAnimationFrame',(id:number)=>window.clearTimeout(id))})
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()})
it('walks to an empty seat before sitting, kneels differently, and stands when walking',()=>{
 const motion=vi.fn();render(<SanctuaryScene seat={0} onSeat={vi.fn()} onMotion={motion}/>)
 const avatar=screen.getByRole('img',{name:'나의 3D 픽셀 아바타'})
 fireEvent.click(screen.getByRole('button',{name:'앉아 기도'}))
 expect(avatar).toHaveAttribute('data-pose','standing')
 act(()=>vi.advanceTimersByTime(7000));expect(avatar).toHaveAttribute('data-pose','sitting')
 fireEvent.click(screen.getByRole('button',{name:'무릎 기도'}));expect(avatar).toHaveAttribute('data-pose','kneeling')
 expect(avatar.querySelector('.pixel-thigh')).toBeTruthy();expect(avatar.querySelector('.pixel-shin')).toBeTruthy()
 expect(motion).toHaveBeenLastCalledWith(expect.any(Object),expect.any(Number),false,'kneeling')
 const group=screen.getByRole('group',{name:'아바타 이동이 가능한 예배당'})
 fireEvent.keyDown(group,{key:'w'});act(()=>vi.advanceTimersByTime(100));fireEvent.keyUp(group,{key:'w'})
 expect(avatar).toHaveAttribute('data-pose','standing')
})
it('opens the prayer box only once after reaching its approach point',()=>{
 const open=vi.fn();render(<SanctuaryScene seat={0} onSeat={vi.fn()} onPrayerBox={open} prayerCount={3}/>)
 fireEvent.click(screen.getByRole('button',{name:'중보기도함 열기'}));expect(open).not.toHaveBeenCalled()
 act(()=>vi.advanceTimersByTime(8000));expect(open).toHaveBeenCalledOnce()
 const anchor=document.querySelector('.sanctuary-avatar-anchor')!;expect(Number(anchor.getAttribute('data-avatar-x'))).toBeCloseTo(sanctuaryPrayerBoxPoint.x);expect(Number(anchor.getAttribute('data-avatar-z'))).toBeCloseTo(sanctuaryPrayerBoxPoint.z)
 act(()=>vi.advanceTimersByTime(1000));expect(open).toHaveBeenCalledOnce()
})
it('cancels a pending arrival interaction when manual movement takes over',()=>{
 const open=vi.fn(),{result}=renderHook(()=>useSanctuaryMovement(sanctuarySpawn))
 act(()=>result.current.goTo(sanctuaryPrayerBoxPoint,false,open));act(()=>vi.advanceTimersByTime(128))
 act(()=>{result.current.keyDown('w');result.current.keyUp('w')})
 act(()=>vi.advanceTimersByTime(9000));expect(open).not.toHaveBeenCalled();expect(result.current.destination).toBeNull()
})
it('does not allow selecting a seat visibly occupied by another member',()=>{
 render(<SanctuaryScene seat={0} onSeat={vi.fn()} peers={[{uid:'bob',name:'Bob',skin:0,hair:0,shirt:0,x:-.56,z:.27,facing:180,moving:false,pose:'sitting',updatedAt:Date.now()}]}/>)
 expect(screen.getByRole('button',{name:'앞쪽 왼편 자리 선택'})).toBeDisabled()
 expect(screen.getByRole('button',{name:'앞쪽 왼편 바깥쪽 자리 선택'})).not.toBeDisabled()
 expect(screen.getByRole('button',{name:'앞쪽 오른편 자리 선택'})).not.toBeDisabled()
})
