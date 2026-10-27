// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {CityMap3D} from './CityMap3D'
vi.mock('./CityAvatar',()=>({useCityWorld:()=>({avatars:{},commands:{}})}))
vi.mock('./city3dRenderer',()=>({createCity3DRenderer:()=>{throw new Error('WebGL unavailable')}}))
afterEach(cleanup)
describe('destination preview without forced walking',()=>{
 it('previews a fallback building and keeps direct entry available without moving the resident',async()=>{
  const onEnter=vi.fn();const before=localStorage.getItem('ai-city:street:v1:ai01')
  render(<CityMap3D showMeet={false} profiles={[]} residentId="ai01" active recordsReady onEnter={onEnter}/>)
  fireEvent.click(await screen.findByRole('button',{name:'도시 건의소 · 건의함 열기'}))
  expect(await screen.findByRole('button',{name:'건의함 보러 입장'})).toBeTruthy()
  expect(onEnter).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'← 지도로 돌아가기'}))
  fireEvent.change(screen.getByLabelText('바로 찾을 장소'),{target:{value:'studio'}})
  fireEvent.click(screen.getByRole('button',{name:'최근 작업 보기'}))
  expect(await screen.findByRole('button',{name:'작품집 보러 입장'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'작품집 보러 입장'}))
  expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({id:'studio'}))
  fireEvent.change(screen.getByLabelText('바로 찾을 장소'),{target:{value:'hall'}})
  fireEvent.click(screen.getByRole('button',{name:'바로 입장 ↗'}))
  expect(onEnter).toHaveBeenLastCalledWith(expect.objectContaining({id:'hall'}))
  const after=localStorage.getItem('ai-city:street:v1:ai01')
  if(before)expect(after).toBe(before)
  else expect(JSON.parse(after!)).toMatchObject({x:-3,z:8,yaw:0,pitch:0})
 })
})
