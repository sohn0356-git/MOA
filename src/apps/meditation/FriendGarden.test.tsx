// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {FriendGarden} from './FriendGarden'
vi.mock('../../services/firebase',()=>({getRealtimeDb:()=>({})}))
vi.mock('firebase/database',()=>({ref:(_db:unknown,path:string)=>path,onValue:(_path:string,callback:(s:{val:()=>unknown})=>void)=>{callback({val:()=>({name:'새 이름',gender:'female',hair:1,skin:1,shirt:2})});return()=>{}}}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
it('shows only registered friends, uses their saved avatars, wanders and toggles a name popup',()=>{
 vi.useFakeTimers()
 render(<FriendGarden friends={[{uid:'bob',name:'Bob'}]}/>)
 const friend=screen.getByRole('button',{name:'Bob 아바타'}),before=friend.getAttribute('style')
 expect(screen.getByRole('img',{name:'Bob의 아바타'})).toHaveAttribute('data-gender','female')
 expect(screen.queryByRole('status')).toBeNull()
 fireEvent.click(friend);expect(screen.getByRole('status')).toHaveTextContent('새 이름')
 act(()=>vi.advanceTimersByTime(6700));expect(friend.getAttribute('style')).not.toBe(before)
 fireEvent.click(friend);expect(screen.queryByRole('status')).toBeNull()
})
it('offers an empty courtyard without inventing sample friends',()=>{
 render(<FriendGarden friends={[]}/>);expect(screen.getByText('함께 걸을 친구를 기다리고 있어요')).toBeInTheDocument();expect(screen.queryByRole('button')).toBeNull()
})
