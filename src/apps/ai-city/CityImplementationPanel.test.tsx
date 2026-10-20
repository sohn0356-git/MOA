// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {CityImplementationPanel} from './CityImplementationPanel'
import {changeCityImplementation,subscribeCityImplementationEvents,type CityPost,type CityImplementationEvent} from './cityService'
vi.mock('./cityService',()=>({changeCityImplementation:vi.fn(),subscribeCityImplementationEvents:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();vi.mocked(changeCityImplementation).mockResolvedValue('event-1');vi.mocked(subscribeCityImplementationEvents).mockImplementation((_id,callback)=>{callback([]);return()=>{}})})
const post:CityPost={id:'fixture-only',kind:'suggestion',accountId:'ai02',authorUid:'u2',body:'전용 검증 건의',createdAt:1}
const perform=async(action:()=>Promise<void>)=>{try{await action();return true}catch{return false}}
it('requires explicit evidence and can cancel without writing',()=>{
 render(<CityImplementationPanel post={post} accountId="ai01" busy={false} perform={perform}/>)
 fireEvent.click(screen.getByRole('checkbox',{name:'반영 완료'}))
 expect(screen.getByText('기존: 미반영 → 변경: 반영 완료')).toBeTruthy()
 expect((screen.getByRole('button',{name:'상태 변경 저장'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'상태 변경 취소'}))
 expect(changeCityImplementation).not.toHaveBeenCalled()
 expect(document.activeElement).toBe(screen.getByRole('checkbox'))
})
it('blocks duplicate clicks and appends an undo rather than deleting the change',async()=>{
 let finish:(value:string)=>void=()=>{}
 vi.mocked(changeCityImplementation).mockImplementationOnce(()=>new Promise<string>(resolve=>{finish=resolve}))
 render(<CityImplementationPanel post={post} accountId="ai01" busy={false} perform={perform}/>)
 fireEvent.click(screen.getByRole('checkbox'))
 fireEvent.change(screen.getByLabelText('짧은 확인 근거'),{target:{value:'전용 테스트 통과'}})
 const save=screen.getByRole('button',{name:'상태 변경 저장'})
 fireEvent.click(save);fireEvent.click(save)
 expect(changeCityImplementation).toHaveBeenCalledTimes(1)
 finish('event-1')
 await screen.findByRole('button',{name:'상태 변경 실행 취소'})
 fireEvent.click(screen.getByRole('button',{name:'상태 변경 실행 취소'}))
 await waitFor(()=>expect(changeCityImplementation).toHaveBeenLastCalledWith('ai01','fixture-only',false,'직전 상태 변경 실행 취소',undefined,'event-1'))
 expect(screen.getByText('실행 취소됨 · 이전 상태로 복원했습니다.')).toBeTruthy()
})
it('keeps evidence on failed saves and restores the latest reversible event after reopening',async()=>{
 vi.mocked(changeCityImplementation).mockRejectedValueOnce(new Error('offline'))
 const view=render(<CityImplementationPanel post={post} accountId="ai01" busy={false} perform={perform}/>)
 fireEvent.click(screen.getByRole('checkbox'))
 fireEvent.change(screen.getByLabelText('짧은 확인 근거'),{target:{value:'남겨둘 근거'}})
 fireEvent.click(screen.getByRole('button',{name:'상태 변경 저장'}))
 await screen.findByRole('alert')
 expect((screen.getByLabelText('짧은 확인 근거') as HTMLTextAreaElement).value).toBe('남겨둘 근거')
 view.unmount()
 const event:CityImplementationEvent={id:'event-2',applied:true,previousApplied:false,previousReviewedAt:0,previousEventId:'',reviewedAt:2,reviewerAccount:'ai01',reviewerUid:'u1',note:'저장된 근거',action:'change',undoOf:''}
 vi.mocked(subscribeCityImplementationEvents).mockImplementation((_id,callback)=>{callback([event]);return()=>{}})
 render(<CityImplementationPanel post={{...post,implementation:{applied:true,eventId:'event-2',reviewedAt:2,reviewerAccount:'ai01',reviewerUid:'u1',note:'저장된 근거'}}} accountId="ai01" busy={false} perform={perform}/>)
 expect(screen.getByRole('button',{name:'상태 변경 실행 취소'})).toBeTruthy()
 expect(screen.getByText(/저장된 근거 · ai01/)).toBeTruthy()
})
