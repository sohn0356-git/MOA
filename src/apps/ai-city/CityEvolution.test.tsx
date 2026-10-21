// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {CityMaterials} from './CityMaterials'
import {CityPublishing} from './CityPublishing'
import {CityConversationStage,CityCommentCorrections,CityCorrectionQuote} from './CityConversationHistory'
import {CitySentQuestions} from './CitySentQuestions'
import {CityProgress} from './CityProgress'
import {CityTime,CityTimeContext,cityDateKey} from './CityTime'
import {watchCityRecords,watchCityValue,saveMaterial,correctComment,addPostStage,subscribeSentQuestions,withdrawQuestion,watchEditorPlans,createEdition,readEdition,requestEditionConsent,publishEdition,watchProgress,type Edition} from './cityCollaboration'
import {createCityQuestion,type CityPost} from './cityService'
import {defaultCityProfiles} from './cityResidents'
vi.mock('./cityCollaboration',()=>({watchCityRecords:vi.fn(),watchCityValue:vi.fn(),saveMaterial:vi.fn(),correctComment:vi.fn(),addPostStage:vi.fn(),subscribeSentQuestions:vi.fn(),withdrawQuestion:vi.fn(),watchEditorPlans:vi.fn(),createEdition:vi.fn(),readEdition:vi.fn(),requestEditionConsent:vi.fn(),publishEdition:vi.fn(),watchProgress:vi.fn()}))
vi.mock('./cityService',()=>({createCityQuestion:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();vi.mocked(watchCityRecords).mockImplementation((_path,callback)=>{callback([]);return()=>{}});vi.mocked(watchCityValue).mockImplementation((_path,callback)=>{callback({} as never);return()=>{}});vi.mocked(watchEditorPlans).mockImplementation((_account,_resident,callback)=>{callback([]);return()=>{}})})
const profiles=defaultCityProfiles
const posts:CityPost[]=[{id:'p1',accountId:'ai01',authorUid:'u1',kind:'feed',body:'원문 1\n첫 장면',createdAt:1},{id:'p2',accountId:'ai02',authorUid:'u2',kind:'feed',body:'다른 판 2',createdAt:2},{id:'p3',accountId:'ai01',authorUid:'u1',kind:'feed',body:'시각 노트 3',createdAt:3}]
const perform=async(action:()=>Promise<void>)=>{try{await action();return true}catch{return false}}
const meta={id:'m1',operatorUid:'u1',operatorAccount:'ai01',createdAt:1}
it('creates a derived material with care and unverified conditions while retaining original source',async()=>{
 const material={...meta,residentId:'ai01',projectId:'',name:'작은 천',description:'설계 후보',conditions:'교체 담당 미정',unverified:'기울기 미검증',sourcePostId:'p1',parentId:''}
 vi.mocked(watchCityRecords).mockImplementation((_path,callback)=>{callback([material] as never);return()=>{}})
 render(<CityMaterials residentId="ai01" accountId="ai01" posts={posts} projects={[]} profiles={profiles} busy={false} perform={perform} onOpen={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'참조한 파생안 만들기'}))
 expect((screen.getByLabelText('사용·교체·말리기 조건') as HTMLTextAreaElement).value).toBe('교체 담당 미정')
 fireEvent.change(screen.getByLabelText('자료 이름'),{target:{value:'다른 받침'}})
 fireEvent.click(screen.getByRole('button',{name:'재료 후보 저장'}))
 await waitFor(()=>expect(saveMaterial).toHaveBeenCalledWith('ai01',expect.objectContaining({name:'다른 받침',parentId:'m1',conditions:'교체 담당 미정',unverified:'기울기 미검증'})))
 expect(material.name).toBe('작은 천');expect(posts[0].body).toBe('원문 1\n첫 장면')
})
it('previews correction before append-only save and never edits another resident comment',async()=>{
 const comment={accountId:'ai01',authorUid:'u1',body:'최초 조건',createdAt:1}
 const props={postId:'p1',commentId:'c1',comment,residentId:'ai01',busy:false,perform}
 const ui=render(<CityCommentCorrections {...props}/>)
 fireEvent.click(screen.getByRole('button',{name:'정정하기'}))
 fireEvent.change(screen.getByLabelText('정정 구분'),{target:{value:'meaning'}})
 fireEvent.change(screen.getByLabelText('정정 문장'),{target:{value:'조건을 덧붙임'}})
 fireEvent.change(screen.getByLabelText('정정 이유'),{target:{value:'반론을 반영함'}})
 fireEvent.click(screen.getByRole('button',{name:'정정 전후 확인'}))
 expect(correctComment).not.toHaveBeenCalled()
 expect(screen.getByRole('region',{name:'정정 전후 미리보기'}).textContent).toContain('수정 전: 최초 조건')
 fireEvent.click(screen.getByRole('button',{name:'정정 이력 저장'}))
 await waitFor(()=>expect(correctComment).toHaveBeenCalledWith('ai01','p1','c1','ai01','조건을 덧붙임','반론을 반영함','meaning'))
 expect(comment.body).toBe('최초 조건')
 ui.rerender(<CityCommentCorrections {...props} residentId="ai02"/>)
 expect(screen.queryByRole('button',{name:'정정하기'})).toBeNull()
})
it('shows explicit conversation text and prior stage without changing original comments',async()=>{
 vi.mocked(watchCityRecords).mockImplementation((_path,callback)=>{callback([{...meta,stage:'revision',residentId:'ai01'}] as never);return()=>{}})
 render(<CityConversationStage post={posts[0]} residentId="ai01" busy={false} perform={perform}/>)
 expect(screen.getByText('대화 단계: ↻ 수정안')).toBeTruthy()
 expect(screen.getByText(/미지정 → ↻ 수정안/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'대화 단계 바꾸기'}))
 fireEvent.change(screen.getByLabelText('직접 표시할 대화 단계'),{target:{value:'paused'}})
 fireEvent.click(screen.getByRole('button',{name:'대화 단계 기록'}))
 await waitFor(()=>expect(addPostStage).toHaveBeenCalledWith('ai01','p1','ai01','paused'))
})
it('withdraws only the original question and sends a new target a separate waiting request',async()=>{
 const link={id:'q1',recipientId:'ai02',senderResidentId:'ai01',sourcePostId:'p1',sourceCommentId:'',question:'함께 읽을까요?',operatorUid:'u1',operatorAccount:'ai01',createdAt:1}
 const oldState={ai02:{q1:{status:'accepted' as const,updatedAt:2,operatorUid:'u2',operatorAccount:'ai02'}}}
 vi.mocked(subscribeSentQuestions).mockImplementation((_id,callback)=>{callback([link],{},oldState);return()=>{}})
 render(<CitySentQuestions residentId="ai01" profiles={profiles} posts={posts} busy={false} perform={perform} onOpen={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'철회·새 대상 확인'}))
 fireEvent.change(screen.getByLabelText('철회 이유 (선택)'),{target:{value:'대상을 잘못 고름'}})
 fireEvent.change(screen.getByLabelText('새로 질문할 주민 (선택)'),{target:{value:'ai03'}})
 fireEvent.click(screen.getByRole('button',{name:'철회 후 별도 질문 보내기'}))
 await waitFor(()=>expect(createCityQuestion).toHaveBeenCalledWith('ai01','ai01','ai03','p1','','함께 읽을까요?',{recipientId:'ai02',questionId:'q1'}))
 expect(withdrawQuestion).toHaveBeenCalledWith('ai01','ai01','ai02','q1','대상을 잘못 고름')
 expect(oldState.ai02.q1.status).toBe('accepted')
})
it('orders separate original scenes and previews actual authors without creating public content',async()=>{
 render(<CityPublishing residentId="ai01" accountId="ai01" profiles={profiles} posts={posts} busy={false} perform={perform} onOpen={vi.fn()}/>)
 fireEvent.change(screen.getByLabelText('공동 작품 제목'),{target:{value:'세 장면'}})
 screen.getAllByLabelText('장면 원글').forEach((select,index)=>fireEvent.change(select,{target:{value:'p'+(index+1)}}))
 fireEvent.click(screen.getAllByRole('button',{name:'장면 아래로'})[0])
 fireEvent.click(screen.getByRole('button',{name:'개인 초안 미리 읽기'}))
 const preview=screen.getByRole('region',{name:'공동 작품 미리 읽기'})
 expect(within(preview).getAllByRole('article')[0].textContent).toContain('다른 판 2')
 expect(preview.textContent).toContain(profiles[1].name)
 expect(createEdition).not.toHaveBeenCalled();expect(publishEdition).not.toHaveBeenCalled()
 vi.mocked(createEdition).mockResolvedValue('edition-1')
 vi.mocked(readEdition).mockResolvedValue(null)
 fireEvent.click(screen.getByRole('button',{name:'이 편집본으로 동의 요청'}))
 await waitFor(()=>expect(createEdition).toHaveBeenCalledWith('ai01','ai01','세 장면',expect.arrayContaining([{postId:'p2',connection:''}]),posts))
 expect(requestEditionConsent).not.toHaveBeenCalled()
})
it('requires other resident consent before exposing publish action and keeps the frozen scene order',async()=>{
 const edition:Edition={...meta,id:'e1',residentId:'ai01',title:'함께 읽기',scenes:posts.map(post=>({postId:post.id,connection:'다음으로'})),contributors:{u1:true,u2:true}}
 let notify:(v:object)=>void=()=>{}
 vi.mocked(watchEditorPlans).mockImplementation((_account,_resident,callback)=>{callback([edition]);return()=>{}})
 vi.mocked(watchCityValue).mockImplementation((path,callback)=>{if(path.startsWith('editionConsents/'))notify=callback as (v:object)=>void;callback({} as never);return()=>{}})
 render(<CityPublishing residentId="ai01" accountId="ai01" profiles={profiles} posts={posts} busy={false} perform={perform} onOpen={vi.fn()}/>)
 expect((screen.getByRole('button',{name:'동의된 공동 작품 공개'}) as HTMLButtonElement).disabled).toBe(true)
 act(()=>notify({p2:{...meta,residentId:'ai02',accepted:true}}))
 fireEvent.click(screen.getByRole('button',{name:'동의된 공동 작품 공개'}))
 await waitFor(()=>expect(publishEdition).toHaveBeenCalledWith('ai01',edition))
 expect(edition.scenes[1].postId).toBe('p2')
})
it('uses explicit day boundaries and actual author records without overwriting profile summaries',()=>{
 const now=Date.now(),profile={...profiles[0],activitySummary:'원래 소개'}
 vi.mocked(watchProgress).mockImplementation(callback=>{callback({ai01:{one:{title:'천 설계',nextAction:'다음 조건 확인',question:'미정',status:'paused',projectId:''} as never}},{},{},{});return()=>{}})
 render(<CityProgress profiles={[profile,profiles[1]]} posts={[{...posts[0],createdAt:now}]} projects={[]} timezone="city" onOpen={vi.fn()} onStudio={vi.fn()}/>)
 expect(screen.getByText(/Asia\/Seoul.*00:00/)).toBeTruthy()
 expect(screen.getByText(/진행 · 오늘 글·댓글 1개.*다음 행동 기록됨/)).toBeTruthy()
 fireEvent.click(screen.getByLabelText('오늘 미활동 주민만'))
 expect(screen.queryByRole('heading',{name:profile.name})).toBeNull()
 expect(screen.getByRole('heading',{name:profiles[1].name})).toBeTruthy()
 expect(profile.activitySummary).toBe('원래 소개')
 expect(cityDateKey(Date.UTC(2026,9,20,15,1),'city')).toBe('2026-10-21')
})
it('makes absolute time and zone available while retaining the original timestamp',()=>{
 const value=Date.UTC(2026,9,20,15,1)
 render(<CityTimeContext.Provider value="city"><CityTime value={value}/></CityTimeContext.Provider>)
 expect(screen.getByText(/2026-10-21 00:01:00.*Asia\/Seoul/)).toBeTruthy()
 expect(document.querySelector('time')?.getAttribute('datetime')).toBe(new Date(value).toISOString())
})

it('shows the exact referenced correction instead of silently substituting the latest version',()=>{
 vi.mocked(watchCityRecords).mockImplementation((_path,callback)=>{callback([{...meta,id:'new',body:'나중 문장',reason:'후속',residentId:'ai01',kind:'meaning'},{...meta,id:'old',body:'당시 조건',reason:'당시 정정',residentId:'ai01',kind:'meaning'}] as never);return()=>{}})
 render(<CityCorrectionQuote postId="p1" commentId="c1" correctionId="old" start={0} end={2}/>)
 expect(screen.getByText('당시')).toBeTruthy()
 expect(screen.getByText('당시 조건')).toBeTruthy()
 expect(screen.queryByText('나중 문장')).toBeNull()
})
