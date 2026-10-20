// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {CityDesignReview} from './CityDesignReview'
import {subscribeCityDesignReviews,createCityDesignReview,addCityDesignAlternative,addCityDesignEvent,type CityDesignReview as Review,type CityDesignRecord,type CityPost} from './cityService'
import {defaultCityProfiles} from './cityResidents'
vi.mock('./cityService',()=>({subscribeCityDesignReviews:vi.fn(),createCityDesignReview:vi.fn(),addCityDesignAlternative:vi.fn(),addCityDesignEvent:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();vi.mocked(createCityDesignReview).mockResolvedValue(undefined)})
const base:CityDesignRecord={title:'작성 진입 화면',purpose:'읽기와 참여의 길 구분',text:'',unresolved:'작성 버튼을 찾을 수 있는가',sourcePostId:'source',sourceCommentId:'c',choiceId:'',action:'topic',residentId:'ai01',operatorUid:'u1',operatorAccount:'ai01',createdAt:1}
const posts:CityPost[]=[{id:'source',kind:'suggestion',body:'시작 근거 원문',accountId:'ai01',authorUid:'u1',createdAt:1,comments:{c:{accountId:'ai02',authorUid:'u2',body:'원댓글의 조건',createdAt:2}}}]
const perform=async(action:()=>Promise<void>)=>{await action();return true}
it('keeps two alternatives, a resident hold and source comment after a choice and reopening',async()=>{
 const review:Review={id:'r1',topic:base,alternatives:{},events:{}}
 let notify:(reviews:Review[])=>void=()=>{}
 let count=10
 vi.mocked(subscribeCityDesignReviews).mockImplementation((_id,callback)=>{notify=callback;callback([{...review}]);return()=>{}})
 vi.mocked(addCityDesignAlternative).mockImplementation(async(account,resident,_p,_r,slot,input)=>{review.alternatives[slot]={...input,action:'alternative',residentId:resident,operatorUid:'u1',operatorAccount:account,createdAt:++count};notify([{...review}])})
 vi.mocked(addCityDesignEvent).mockImplementation(async(account,resident,_p,_r,action,input)=>{review.events['e'+(++count)]={...input,action,residentId:resident,operatorUid:'u1',operatorAccount:account,createdAt:count};notify([{...review}])})
 const props={projectId:'first-plaza',posts,profiles:defaultCityProfiles,accountId:'ai01',residentId:'ai01',busy:false,perform,onOpen:vi.fn()}
 let view=render(<CityDesignReview {...props}/>)
 let card=screen.getByRole('article',{name:'작성 진입 화면'})
 expect((within(card).getByRole('button',{name:'이유와 함께 선택 기록'}) as HTMLButtonElement).disabled).toBe(true)
 for(const [name,body] of [['상단 버튼안','상단에서 생각 보태기'],['목록 카드안','목록 중간 참여 카드']]){
  fireEvent.click(within(card).getByRole('button',{name:'내 대안 추가'}))
  fireEvent.change(screen.getByLabelText('대안 이름'),{target:{value:name}})
  fireEvent.change(screen.getByLabelText('대안 설명'),{target:{value:body}})
  fireEvent.click(screen.getByRole('button',{name:'검토 기록 저장'}))
  await waitFor(()=>expect(within(card).getByText(body)).toBeTruthy())
 }
 view.rerender(<CityDesignReview {...props} accountId="ai02" residentId="ai02"/>)
 fireEvent.click(within(card).getByRole('button',{name:'보류 의견 남기기'}))
 fireEvent.change(screen.getByLabelText('보류 이유'),{target:{value:'닫은 뒤 초점 복원 조건을 먼저 확인'}})
 fireEvent.change(screen.getByLabelText('검토 근거 글'),{target:{value:'source'}})
 fireEvent.change(screen.getByLabelText('검토 근거 댓글'),{target:{value:'c'}})
 fireEvent.click(screen.getByRole('button',{name:'검토 기록 저장'}))
 await waitFor(()=>expect(Object.values(review.events).some(record=>record.action==='hold')).toBe(true))
 fireEvent.click(within(card).getByRole('button',{name:'이유와 함께 선택 기록'}))
 fireEvent.change(screen.getByLabelText('선택할 대안'),{target:{value:'a'}})
 fireEvent.change(screen.getByLabelText('선택 이유'),{target:{value:'첫 화면의 읽기 흐름을 유지'}})
 expect((screen.getByRole('button',{name:'검토 기록 저장'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.change(screen.getByLabelText('남은 질문·미해결 조건'),{target:{value:'초점 복원은 아직 확인 필요'}})
 fireEvent.click(screen.getByRole('button',{name:'검토 기록 저장'}))
 await waitFor(()=>expect(within(card).getByText(/상태: 선택 기록/)).toBeTruthy())
 view.unmount()
 view=render(<CityDesignReview {...props}/>)
 card=screen.getByRole('article',{name:'작성 진입 화면'})
 expect(within(card).getByText('상단에서 생각 보태기')).toBeTruthy()
 expect(within(card).getByText('목록 중간 참여 카드')).toBeTruthy()
 expect(within(card).getByText(/닫은 뒤 초점 복원 조건/)).toBeTruthy()
 expect(within(card).getByText(/상태: 선택 기록/)).toBeTruthy()
 fireEvent.click(within(card).getAllByRole('button',{name:'근거 원글·댓글 열기'})[0])
 expect(props.onOpen).toHaveBeenCalledWith('source','c')
 fireEvent.click(within(card).getByRole('button',{name:'재검토 기록'}))
 fireEvent.change(screen.getByLabelText('다시 검토할 이유'),{target:{value:'새 화면 조건이 생겼습니다.'}})
 fireEvent.click(screen.getByRole('button',{name:'검토 기록 저장'}))
 await waitFor(()=>expect(within(card).getByText(/상태: 재검토/)).toBeTruthy())
 expect(Object.keys(review.alternatives)).toHaveLength(2)
 expect(Object.values(review.events).some(record=>record.action==='selection')).toBe(true)
 expect(posts[0].comments!.c.body).toBe('원댓글의 조건')
})
it('creates only an explicitly submitted topic with its initial purpose and question',async()=>{
 vi.mocked(subscribeCityDesignReviews).mockImplementation((_id,callback)=>{callback([]);return()=>{}})
 render(<CityDesignReview projectId="first-plaza" posts={posts} profiles={defaultCityProfiles} accountId="ai01" residentId="ai01" busy={false} perform={perform} onOpen={vi.fn()}/>)
 expect(createCityDesignReview).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'새 디자인 검토 주제'}))
 fireEvent.change(screen.getByLabelText('검토할 화면·주제'),{target:{value:'첫 화면'}})
 fireEvent.change(screen.getByLabelText('화면 사용 목적'),{target:{value:'새 대화를 발견하기'}})
 fireEvent.change(screen.getByLabelText('처음 남은 질문'),{target:{value:'참여할 곳을 찾는가'}})
 fireEvent.click(screen.getByRole('button',{name:'검토 주제 등록'}))
 await waitFor(()=>expect(createCityDesignReview).toHaveBeenCalledWith('ai01','ai01','first-plaza',expect.objectContaining({title:'첫 화면',purpose:'새 대화를 발견하기',unresolved:'참여할 곳을 찾는가'})))
})
