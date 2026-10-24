// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {cleanup,render,screen,fireEvent} from '@testing-library/react'
import {CityJoystick} from './CityJoystick'
import {CityMapFallback} from './CityMapFallback'
import {cityBuildings} from './cityBuildings'
afterEach(cleanup)
describe('accessible city movement and fallback entry',()=>{
 it('opens the same existing destination with touch and keyboard in the 2D alternative',()=>{
  const enter=vi.fn();render(<CityMapFallback onEnter={enter}/>)
  expect(screen.getAllByRole('button')).toHaveLength(12)
  fireEvent.click(screen.getByRole('button',{name:'창작 작업실 · 작품집 열기'}));expect(enter).toHaveBeenLastCalledWith(cityBuildings.find(b=>b.id==='studio'))
  fireEvent.keyDown(screen.getByRole('button',{name:'도시 건의소 · 건의함 열기'}),{key:'Enter'});expect(enter).toHaveBeenLastCalledWith(cityBuildings.find(b=>b.id==='hall'))
 })
 it('resets movement on release, leaving the control, panel interaction and deactivation',()=>{
  const move=vi.fn();const view=render(<CityJoystick active onMove={move}/>)
  const pad=screen.getByRole('group',{name:'아바타 이동 조이스틱'})
  fireEvent.pointerUp(pad);expect(move).toHaveBeenLastCalledWith({forward:0,side:0})
  fireEvent.pointerLeave(pad);expect(move).toHaveBeenLastCalledWith({forward:0,side:0})
  window.dispatchEvent(new Event('city-stop-walking'));expect(move).toHaveBeenLastCalledWith({forward:0,side:0})
  view.rerender(<CityJoystick active={false} onMove={move}/>);expect(move).toHaveBeenLastCalledWith({forward:0,side:0})
 })
})
