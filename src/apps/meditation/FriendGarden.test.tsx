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
 render(<FriendGarden uid="me" friends={[{uid:'bob',name:'Bob'}]}/>)
 const friend=screen.getByRole('button',{name:'Bob 아바타'}),before=friend.getAttribute('style')
 expect(screen.getByRole('img',{name:'Bob의 아바타'})).toHaveAttribute('data-gender','female')
 expect(screen.queryByRole('status')).toBeNull()
 fireEvent.click(friend);expect(screen.getByRole('status')).toHaveTextContent('새 이름')
 act(()=>vi.advanceTimersByTime(6700));expect(friend.getAttribute('style')).not.toBe(before)
 fireEvent.click(friend);expect(screen.queryByRole('status')).toBeNull()
})
it('always includes my saved avatar, even without friends, and only shows group names above the lawn',()=>{
 render(<FriendGarden uid="me" friends={[]}/>);expect(screen.getByRole('button',{name:'나 아바타'})).toBeInTheDocument();expect(screen.getByRole('img',{name:'나의 아바타'})).toHaveAttribute('data-gender','female');expect(screen.getByRole('tab',{name:'전체'})).toHaveAttribute('aria-selected','true');expect(screen.queryByText('마음이 모이는 마당')).toBeNull();expect(screen.queryByText('함께 걸을 친구를 기다리고 있어요')).toBeNull()
})
it('filters by group while keeping me in every group and exposes all groups in a horizontal tab strip',()=>{
 const groups=[{id:'church',name:'교회',createdAt:1,members:{bob:true as const}},{id:'empty',name:'가족',createdAt:2}]
 const view=render(<FriendGarden uid="me" friends={[{uid:'bob',name:'Bob'},{uid:'ann',name:'Ann'}]} groups={groups}/>);
 fireEvent.click(screen.getByRole('tab',{name:'교회'}));expect(screen.getByRole('button',{name:'Bob 아바타'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Ann 아바타'})).toBeNull();expect(screen.getByRole('button',{name:'나 아바타'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('tab',{name:'가족'}));expect(screen.queryByRole('button',{name:'Bob 아바타'})).toBeNull();expect(screen.getByRole('button',{name:'나 아바타'})).toBeInTheDocument();
 view.rerender(<FriendGarden uid="me" friends={[{uid:'bob',name:'Bob'}]} groups={[]}/>);expect(screen.getByRole('tab',{name:'전체'})).toHaveAttribute('aria-selected','true');expect(screen.getByRole('button',{name:'Bob 아바타'})).toBeInTheDocument()
})

it('faces the actual screen movement vector and stops walking when the movement ends',()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(.2);render(<FriendGarden uid="me" friends={[]}/>);
 const avatar=screen.getByRole('img',{name:'나의 아바타'});expect(avatar).toHaveAttribute('data-moving','false');expect(avatar.getAttribute('style')).toContain('--avatar-scale: 0.62');
 vi.mocked(Math.random).mockReturnValue(.8);act(()=>vi.advanceTimersByTime(200));expect(avatar).toHaveAttribute('data-moving','true');expect(avatar.getAttribute('style')).toContain('--avatar-facing: '+(Math.atan2(84,68)*180/Math.PI));
 act(()=>vi.advanceTimersByTime(6000));expect(avatar).toHaveAttribute('data-moving','false');
})
