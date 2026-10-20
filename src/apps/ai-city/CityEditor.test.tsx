// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {CityLab} from './CityLab'
import {CityVisualNote} from './CityVisualNote'
import {CityProjectActivities} from './CityProjectActivities'
import {subscribeCityLabs,saveCityLabEvent,subscribeCityVisualNotes,saveCityVisualNote,subscribeCityProjectTasks,subscribeCityDesignReviews,type CityVisualNote as Note,type CityPost,type CityLabEvent,type CityDesignRecord} from './cityService'
import {defaultCityProfiles} from './cityResidents'
vi.mock('./cityService',()=>({subscribeCityLabs:vi.fn(),saveCityLabEvent:vi.fn(),subscribeCityVisualNotes:vi.fn(),saveCityVisualNote:vi.fn(),subscribeCityProjectTasks:vi.fn(),subscribeCityDesignReviews:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();vi.mocked(subscribeCityLabs).mockImplementation((_id,callback)=>{callback({});return()=>{}});vi.mocked(subscribeCityProjectTasks).mockImplementation((_id,callback)=>{callback([],{});return()=>{}});vi.mocked(subscribeCityDesignReviews).mockImplementation((_id,callback)=>{callback([]);return()=>{}})})
const perform=async(action:()=>Promise<void>)=>{try{await action();return true}catch{return false}}
it('keeps a failed lab editor open, supports continue and offers no unsupported draft storage',async()=>{
 vi.mocked(saveCityLabEvent).mockRejectedValue(new Error('offline'))
 render(<CityLab projectId="first-plaza" posts={[]} profiles={defaultCityProfiles} residentId="ai01" accountId="ai01" busy={false} perform={perform} onOpen={vi.fn()}/>)
 const opener=screen.getByRole('button',{name:'새 비교 준비'});opener.focus();fireEvent.click(opener)
 for(const name of ['비교 질문','비교안 A','비교안 B','고정 조건','판단 기준'])fireEvent.change(screen.getByLabelText(name),{target:{value:name+' 내용'}})
 fireEvent.click(screen.getByRole('button',{name:'기록 닫기'}))
 const guard=screen.getByRole('group',{name:'실험실 편집 닫기 확인'})
 expect(within(guard).queryByRole('button',{name:'초안으로 보관 후 닫기'})).toBeNull()
 expect(within(guard).getByText(/이 도구는 초안 보관을 지원하지 않습니다/)).toBeTruthy()
 fireEvent.click(within(guard).getByRole('button',{name:'계속 편집'}))
 expect((screen.getByLabelText('비교 질문') as HTMLTextAreaElement).value).toBe('비교 질문 내용')
 fireEvent.click(screen.getByRole('button',{name:'비교 기록 저장'}))
 await waitFor(()=>expect(screen.getByText(/실험실 편집 · 실패/)).toBeTruthy())
 expect(screen.getByRole('form',{name:'비교 기록'})).toBeTruthy()
 expect((screen.getByLabelText('판단 기준') as HTMLTextAreaElement).value).toBe('판단 기준 내용')
 fireEvent.click(screen.getByRole('button',{name:'기록 닫기'}))
 fireEvent.click(screen.getByRole('button',{name:'변경 버리기'}))
 await waitFor(()=>expect(document.activeElement).toBe(opener))
 expect(screen.queryByLabelText('비교 질문')).toBeNull()
})
it('does not interrupt an unchanged palette and reloads actual saved values on reopening',async()=>{
 const post:CityPost={id:'p',kind:'feed',accountId:'ai01',authorUid:'u1',body:'원문',createdAt:1}
 let notes:Note[]=[{id:'v1',palette:[],foreground:'원래 전경',middle:'',background:'',emphasis:'',negativeSpace:'',createdAt:1,operatorUid:'u1',operatorAccount:'ai01'}]
 let notify:(value:Note[])=>void=()=>{}
 vi.mocked(subscribeCityVisualNotes).mockImplementation((_id,callback)=>{notify=callback;callback(notes);return()=>{}})
 vi.mocked(saveCityVisualNote).mockImplementation(async(_account,_post,input)=>{notes=[{...input,id:'v2',createdAt:2,operatorUid:'u1',operatorAccount:'ai01'},...notes];notify(notes)})
 render(<CityVisualNote post={post} accountId="ai01" busy={false} perform={perform}/>)
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 편집 시작'}))
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 편집 닫기'}))
 expect(screen.queryByRole('group',{name:'시각 노트 편집 닫기 확인'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 편집 시작'}))
 fireEvent.change(screen.getByLabelText('전경'),{target:{value:'저장할 새 전경'}})
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 새 판 저장'}))
 await waitFor(()=>expect(screen.getByText('시각 노트 편집 · 저장됨')).toBeTruthy())
 fireEvent.click(screen.getByRole('button',{name:'시각 노트 편집 시작'}))
 expect((screen.getByLabelText('전경') as HTMLTextAreaElement).value).toBe('저장할 새 전경')
 expect(post.body).toBe('원문')
})
it('uses actual activity counts and explicit recorded questions without inventing an in-progress status',()=>{
 const lab:CityLabEvent={id:'e',question:'버튼 뜻을 어떻게 읽는가',optionA:'A',optionB:'B',conditions:'같은 그림',criteria:'기대 동작',phase:'unperformed',origin:'none',evidence:'',observation:'',sourcePostId:'',residentId:'ai01',createdAt:1,operatorUid:'u1',operatorAccount:'ai01'}
 const topic:CityDesignRecord={title:'첫 화면',purpose:'읽기',text:'',unresolved:'입구 버튼은 찾을 수 있는가',sourcePostId:'',sourceCommentId:'',choiceId:'',action:'topic',residentId:'ai01',operatorUid:'u1',operatorAccount:'ai01',createdAt:1}
 vi.mocked(subscribeCityLabs).mockImplementation((_id,callback)=>{callback({one:[lab]});return()=>{}})
 vi.mocked(subscribeCityDesignReviews).mockImplementation((_id,callback)=>{callback([{id:'r',topic,alternatives:{},events:{}}]);return()=>{}})
 vi.mocked(subscribeCityProjectTasks).mockImplementation((_id,callback)=>{callback([{id:'t',title:'검토 한번',scopeNote:'한 번만',sourcePostId:'',createdAt:1,operatorUid:'u1',operatorAccount:'ai01'}],{});return()=>{}})
 const choose=vi.fn()
 render(<CityProjectActivities projectId="first-plaza" posts={[{id:'p',kind:'feed',accountId:'ai01',authorUid:'u1',body:'연결 대화',projectId:'first-plaza',createdAt:1}]} onChoose={choose}/>)
 const design=screen.getByRole('button',{name:/대안 검토/}),labCard=screen.getByRole('button',{name:/비교 준비/})
 expect(design.textContent).toContain('실제 기록 1개');expect(design.textContent).toContain('입구 버튼은 찾을 수 있는가')
 expect(labCard.textContent).toContain('실제 기록 1개');expect(labCard.textContent).toContain('버튼 뜻을 어떻게 읽는가')
 expect(labCard.textContent).not.toContain('진행중')
 fireEvent.click(design);expect(choose).toHaveBeenCalledWith('design')
})
