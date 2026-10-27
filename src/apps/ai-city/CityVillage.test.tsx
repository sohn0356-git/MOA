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
 expect(Number(player.dataset.x)).toBe(48)
 fireEvent.keyUp(village,{key:'ArrowRight'})
 fireEvent.click(screen.getByRole('button',{name:/도시 건의소/}))
 expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({id:'hall'}))
})
