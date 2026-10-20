// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {CitySignboards} from './CitySignboards'
import {CityVisualNote} from './CityVisualNote'
import {defaultCityProfiles} from './cityResidents'
import {subscribeCitySignboards,saveCitySignboard,subscribeCityVisualNotes,saveCityVisualNote,type CitySignboard,type CityVisualNote as CityVisualNoteEdition,type CityPost} from './cityService'
vi.mock('./cityService',()=>({subscribeCitySignboards:vi.fn(),saveCitySignboard:vi.fn(),subscribeCityVisualNotes:vi.fn(),saveCityVisualNote:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks()})
const perform=async(action:()=>Promise<void>)=>{await action();return true}
const post:CityPost={id:'p',kind:'feed',accountId:'ai01',authorUid:'u1',projectId:'project-table',body:'메뉴·자원 안내의 원문',createdAt:1,comments:{c:{accountId:'ai02',authorUid:'u2',body:'원문 댓글',createdAt:2}}}
it('requires a visit preview and preserves other positions and older signboard editions after reopening',async()=>{
 const base={positionName:'입구',text:'예전 입구',sourcePostId:'p',residentId:'ai01',createdAt:1,operatorUid:'u1',operatorAccount:'ai01',id:'v1'}
 const boards:Record<string,CitySignboard[]>={entrance:[base],use:[{...base,text:'잔 선택 안내'}],participation:[{...base,text:'담당은 직접 동의'}]}
 let notify:(value:Record<string,CitySignboard[]>)=>void=()=>{}
 vi.mocked(subscribeCitySignboards).mockImplementation((_id,callback)=>{notify=callback;callback(boards);return()=>{}})
 vi.mocked(saveCitySignboard).mockImplementation(async(_a,residentId,_p,position,input)=>{boards[position]=[{...input,id:'v2',residentId,createdAt:2,operatorUid:'u1',operatorAccount:'ai01'},...boards[position]];notify({...boards})})
 const props={projectId:'project-table',posts:[post],profiles:defaultCityProfiles,residentId:'ai01',accountId:'ai01',busy:false,perform,onOpen:vi.fn()}
 let view=render(<CitySignboards {...props}/>)
 expect(within(screen.getByRole('article',{name:'입구 현재 안내'})).getByText('예전 입구')).toBeTruthy()
 expect(screen.queryByText('잔 선택 안내')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'이 위치 안내판 편집'}))
 fireEvent.change(screen.getByLabelText('안내 문장'),{target:{value:'잠시 들러도 됩니다.'}})
 expect(screen.queryByRole('button',{name:'이 안내판 게시'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'방문 미리보기'}))
 expect(within(screen.getByRole('region',{name:'방문 미리보기'})).getByText('잠시 들러도 됩니다.')).toBeTruthy()
 expect(saveCitySignboard).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'이 안내판 게시'}))
 await waitFor(()=>expect(saveCitySignboard).toHaveBeenCalledWith('ai01','ai01','project-table','entrance',expect.objectContaining({text:'잠시 들러도 됩니다.'})))
 expect(boards.use[0].text).toBe('잔 선택 안내')
 expect(boards.participation[0].text).toBe('담당은 직접 동의')
 view.unmount()
 view=render(<CitySignboards {...props}/>)
 expect(within(screen.getByRole('article',{name:'입구 현재 안내'})).getByText('잠시 들러도 됩니다.')).toBeTruthy()
 expect(screen.getByText('예전 입구')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'안내 근거 글·댓글'}))
 expect(props.onOpen).toHaveBeenCalledWith('p')
 expect(post.comments!.c.body).toBe('원문 댓글')
 view.unmount()
})
it('keeps optional composition fields and preserves prior palettes and original comments',async()=>{
 const notes:CityVisualNoteEdition[]=[]
 let notify:(value:CityVisualNoteEdition[])=>void=()=>{}
 vi.mocked(subscribeCityVisualNotes).mockImplementation((_id,callback)=>{notify=callback;callback([...notes]);return()=>{}})
 vi.mocked(saveCityVisualNote).mockImplementation(async(_a,_p,input)=>{notes.unshift({...input,id:'v'+(notes.length+1),createdAt:notes.length+1,operatorUid:'u1',operatorAccount:'ai01'});notify([...notes])})
 const props={post,accountId:'ai01',busy:false,perform}
 let view=render(<CityVisualNote {...props}/>)
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 편집 시작'}))
 fireEvent.click(screen.getByRole('checkbox',{name:'색 견본 사용 (2~5개)'}))
 expect((screen.getByRole('button',{name:'시각 노트 새 판 저장'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.change(screen.getByLabelText('색 1 이름'),{target:{value:'푸른 먹색'}})
 fireEvent.change(screen.getByLabelText('색 2 이름'),{target:{value:'탁한 금빛'}})
 fireEvent.change(screen.getByLabelText('전경'),{target:{value:'왼쪽 아래 배'}})
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 새 판 저장'}))
 await waitFor(()=>expect(notes).toHaveLength(1))
 expect(notes[0].middle).toBe('')
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 편집 시작'}))
 fireEvent.change(screen.getByLabelText('색 1 색상값'),{target:{value:'#263859'}})
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 새 판 저장'}))
 await waitFor(()=>expect(notes).toHaveLength(2))
 expect(notes[1].palette[0].hex).toBe('#273447')
 expect(notes[0].palette[0].hex).toBe('#263859')
 view.unmount()
 view=render(<CityVisualNote {...props}/>)
 expect(screen.getByText('팔레트·구도 카드 · 2판')).toBeTruthy()
 expect(screen.getAllByText(/푸른 먹색 · #263859/).length).toBeGreaterThan(0)
 expect(screen.getAllByText('아직 정하지 않음').length).toBeGreaterThan(0)
 expect(post.body).toBe('메뉴·자원 안내의 원문')
 expect(post.comments!.c.body).toBe('원문 댓글')
 view.unmount()
})
it('does not show edit controls to another author',()=>{
 vi.mocked(subscribeCityVisualNotes).mockImplementation((_id,callback)=>{callback([]);return()=>{}})
 render(<CityVisualNote post={post} accountId="ai02" busy={false} perform={perform}/>)
 expect(screen.queryByRole('button',{name:'시각 노트 편집 시작'})).toBeNull()
})
