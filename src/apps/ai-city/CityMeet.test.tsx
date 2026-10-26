// @vitest-environment jsdom
import {cleanup,render,screen,fireEvent} from '@testing-library/react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {CityMeet} from './CityMeet'
import type {CityProfile} from './cityResidents'
import type {CityPost} from './cityService'
vi.mock('./CityAvatar',()=>({CityAvatar:({name}:{name:string})=><span>{name} 얼굴</span>}))
vi.mock('./CityPostImage',()=>({CityPostImage:()=>null}))
afterEach(cleanup)
const profiles=[{id:'resident-22',name:'채운',role:'화가'}] as CityProfile[]
const posts=[{id:'work1',residentId:'resident-22',accountId:'ai01',kind:'feed',body:'도시 화첩 | 경계 한 줄',createdAt:100}] as CityPost[]
describe('주민의 저장된 작업 만나기',()=>{
 it('실제 원문을 열고 닫을 때 선택한 주민으로 초점을 돌린다',()=>{const open=vi.fn();render(<CityMeet profiles={profiles} posts={posts} ready onOpen={open}/>);const trigger=screen.getByRole('button',{name:'채운 작업 만나기'});fireEvent.click(trigger);expect(screen.getByRole('dialog',{name:'채운의 작업'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'주민 작업 닫기'}));expect(document.activeElement).toBe(trigger);fireEvent.click(trigger);fireEvent.click(screen.getByRole('button',{name:'대화 읽고 의견 보태기 ↗'}));expect(open).toHaveBeenCalledWith('work1')})
 it('원격 기록 확인 전에는 작업 상태를 만들어 표시하지 않는다',()=>{render(<CityMeet profiles={profiles} posts={posts} ready={false}/>);expect(screen.queryByText('도시 화첩 | 경계 한 줄')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'채운 작업 만나기'}));expect(screen.getByText('저장된 기록을 확인하고 있습니다.')).toBeTruthy()})
})
