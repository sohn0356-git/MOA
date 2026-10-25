// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {CityArrival} from './CityArrival'
import type {CityPost,CityWork} from './cityService'
afterEach(cleanup)
const posts:CityPost[]=[{id:'p1',kind:'feed',accountId:'ai01',authorUid:'u1',body:'오래된 원글',createdAt:1},{id:'p2',kind:'feed',accountId:'ai02',authorUid:'u2',body:'다른 원글',createdAt:2},{id:'p3',kind:'feed',accountId:'ai03',authorUid:'u3',body:'작품으로 등록하지 않은 도시 글',createdAt:999}]
const works:CityWork[]=[{id:'w1',sourcePostId:'p1',title:'첫 구상',type:'text',status:'draft',order:0,ownerUid:'u1',createdAt:1,updatedAt:10},{id:'w2',sourcePostId:'p2',title:'최근 완성 작품',type:'text',status:'finished',order:1,ownerUid:'u2',createdAt:2,updatedAt:100}]
describe('source-backed city arrival guide',()=>{
 it('shows actual registered work updates with source authors and opens the original or existing place',async()=>{
  const onOpen=vi.fn(),onEnter=vi.fn()
  render(<CityArrival posts={posts} works={works} profiles={[]} ready residentId="ai01" onOpen={onOpen} onEnter={onEnter}/>)
  expect(screen.queryByText('최근 완성 작품')).toBeNull()
  fireEvent.click(screen.getByText('누가, 무엇을 만들고 있나요?'))
  await screen.findByLabelText('최근 활동을 볼 장소')
  expect(screen.getByText('최근 완성 작품')).toBeTruthy();expect(screen.getByText('완료한 작품')).toBeTruthy()
  expect(screen.queryByText('작품으로 등록하지 않은 도시 글')).toBeNull()
  fireEvent.click(screen.getAllByRole('button',{name:'작성자가 남긴 원문 읽기 ↗'})[0])
  expect(onOpen).toHaveBeenCalledWith('p2')
  fireEvent.change(screen.getByLabelText('최근 활동을 볼 장소'),{target:{value:'post'}})
  expect(screen.getByText('도시 전체의 최근 기록 · 이 장소 안의 활동으로 분류하지 않음')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('최근 활동을 볼 장소'),{target:{value:'studio'}})
  fireEvent.click(screen.getByRole('button',{name:'작품집 보러 입장'}))
  expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({id:'studio'}))
  expect(screen.queryByText('최근 완성 작품')).toBeNull()
 })
 it('opens a requested building without entering and closes without changing records',async()=>{
  const onEnter=vi.fn(),onClose=vi.fn()
  const view=render(<CityArrival posts={posts} works={works} profiles={[]} ready residentId="ai01" onEnter={onEnter} requestedPlace="hall" onPreviewClose={onClose}/>)
  expect(await screen.findByRole('button',{name:'건의함 보러 입장'})).toBeTruthy()
  expect(onEnter).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'← 지도로 돌아가기'}))
  expect(onClose).toHaveBeenCalled()
  view.rerender(<CityArrival posts={posts} works={works} profiles={[]} ready residentId="ai01" onEnter={onEnter} requestedPlace="studio" onPreviewClose={onClose}/>)
  expect(await screen.findByText('최근 완성 작품')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'작품집 보러 입장'}))
  expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({id:'studio'}))
 })
 it('keeps unconfirmed records as loading rather than inventing activity or completed work',async()=>{
  render(<CityArrival posts={posts} works={works} profiles={[]} ready={false} residentId="ai01" onEnter={()=>{}}/>)
  fireEvent.click(screen.getByText('누가, 무엇을 만들고 있나요?'))
  expect(await screen.findByText('최근 기록을 확인하는 중…')).toBeTruthy()
  expect(screen.queryByText('최근 완성 작품')).toBeNull()
 })
})
