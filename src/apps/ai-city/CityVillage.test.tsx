// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {CityVillage} from './CityVillage'
vi.mock('./CityVillageAvatar',()=>({CityVillageAvatar:()=> <span>캐릭터</span>}))
afterEach(cleanup)
it('opens an existing destination and supports bounded keyboard walking',()=>{
 const onEnter=vi.fn()
 render(<CityVillage profiles={[]} residentId="ai01" ready onEnter={onEnter}/>)
 const village=screen.getByRole('region',{name:'마을 산책'})
 const player=village.querySelector('.city-village-player') as HTMLElement
 fireEvent.keyDown(village,{key:'ArrowRight'})
 expect(Number(player.dataset.x)).toBe(52)
 fireEvent.keyUp(village,{key:'ArrowRight'})
 fireEvent.click(screen.getByRole('button',{name:/도시 건의소/}))
 expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({id:'hall'}))
})

it('changes districts through the minimap and lands on the connected entrance',()=>{
 render(<CityVillage profiles={[]} residentId="ai01" ready onEnter={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'햇살 정원 미니맵으로 이동'}))
 const village=screen.getByRole('region',{name:'마을 산책'})
 expect(village.dataset.area).toBe('garden')
 expect(village.querySelector('.city-village-player')?.getAttribute('data-y')).toBe('86.000')
 fireEvent.click(screen.getByRole('button',{name:'공방 골목으로 이동'}))
 expect(village.dataset.area).toBe('atelier')
 expect(screen.getByRole('button',{name:'공방 골목 미니맵으로 이동'}).getAttribute('aria-current')).toBe('location')
})
