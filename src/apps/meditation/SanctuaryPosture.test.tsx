// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {SanctuaryScene} from './SanctuaryScene'
afterEach(cleanup)
it('prays sitting or kneeling, broadcasts posture, and stands when walking',()=>{
 const motion=vi.fn()
 render(<SanctuaryScene seat={0} onSeat={vi.fn()} onMotion={motion}/>)
 const avatar=screen.getByRole('img',{name:'나의 3D 픽셀 아바타'})
 fireEvent.click(screen.getByRole('button',{name:'앉아 기도'}))
 expect(avatar).toHaveAttribute('data-pose','sitting')
 fireEvent.click(screen.getByRole('button',{name:'무릎 기도'}))
 expect(avatar).toHaveAttribute('data-pose','kneeling')
 expect(motion).toHaveBeenLastCalledWith(expect.any(Object),expect.any(Number),false,'kneeling')
 fireEvent.keyDown(screen.getByRole('group',{name:'아바타 이동이 가능한 예배당'}),{key:'w'})
 fireEvent.keyUp(screen.getByRole('group',{name:'아바타 이동이 가능한 예배당'}),{key:'w'})
 expect(avatar).toHaveAttribute('data-pose','standing')
 expect(motion).toHaveBeenLastCalledWith(expect.any(Object),expect.any(Number),false,'standing')
})
it('opens the in-room prayer box without triggering floor walking',()=>{
 const open=vi.fn()
 render(<SanctuaryScene seat={0} onSeat={vi.fn()} onPrayerBox={open} prayerCount={3}/>)
 fireEvent.click(screen.getByRole('button',{name:'중보기도함 열기'}))
 expect(open).toHaveBeenCalledOnce()
 expect(screen.getByRole('button',{name:'중보기도함 열기'})).toHaveTextContent('3')
})
