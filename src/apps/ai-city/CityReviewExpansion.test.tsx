// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {CityReviewMemo} from './CityReviewMemo'
import {CityScenePair} from './CityScenePair'
import {CityPostImage} from './CityPostImage'
import {CityResidentManager} from './CityResidentManager'
import {CityMap} from './CityMap'
import {citySummaryError,citySummaryLimit} from './cityProfileValidation'
import {watchCityRecords,watchCityValue} from './cityCollaboration'
import {proposeMemoParagraph,decideMemoParagraph,publishMemoVersion,saveScenePair,saveImagePreview} from './cityReviewMemoService'
import {saveCityProfile,subscribeCityPlaces,type CityPost} from './cityService'
import {readCityImage} from './cityImageService'
import {defaultCityProfiles} from './cityResidents'
vi.mock('./cityCollaboration',()=>({watchCityRecords:vi.fn(),watchCityValue:vi.fn()}))
vi.mock('./cityReviewMemoService',()=>({createReviewMemo:vi.fn(),proposeMemoParagraph:vi.fn(),decideMemoParagraph:vi.fn(),publishMemoVersion:vi.fn(),saveScenePair:vi.fn(),saveImagePreview:vi.fn()}))
vi.mock('./cityService',()=>({saveCityProfile:vi.fn(),subscribeCityPlaces:vi.fn()}))
vi.mock('./cityImageService',()=>({readCityImage:vi.fn()}))
vi.mock('./CitySignboards',()=>({CitySignboards:()=>null}))
vi.mock('./CityProjectTasks',()=>({CityProjectTasks:()=>null}))
afterEach(()=>{cleanup();vi.restoreAllMocks()})
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();vi.spyOn(window,'scrollTo').mockImplementation(()=>{});vi.mocked(watchCityRecords).mockImplementation((_path,cb)=>{cb([]);return()=>{}});vi.mocked(watchCityValue).mockImplementation((_path,cb)=>{cb({} as never);return()=>{}});vi.mocked(subscribeCityPlaces).mockImplementation(cb=>{cb([]);return()=>{}});vi.mocked(readCityImage).mockResolvedValue('data:image/webp;base64,YWJj')})
const posts:CityPost[]=[{id:'p1',kind:'feed',accountId:'ai01',authorUid:'u1',body:'원문 · 종이의 앞뒤',projectId:'first-plaza',createdAt:10,comments:{c1:{accountId:'ai02',authorUid:'u2',body:'원댓글 조건',createdAt:11}}},{id:'p2',kind:'feed',accountId:'ai02',authorUid:'u2',body:'더 최근의 대화',projectId:'first-plaza',createdAt:20}]
const projects=[{id:'first-plaza',name:'첫 광장',description:'두 프로젝트 중 하나',stage:'idea' as const,participantIds:{}},{id:'empty-place',name:'기록 없는 장소',description:'빈 프로젝트',stage:'idea' as const,participantIds:{}}]
const meta={residentId:'ai01',operatorUid:'u1',operatorAccount:'ai01',createdAt:1}
const proposal={...meta,id:'q1',paragraphKey:'one',body:'기여 문단',postId:'p1',commentId:'c1',baseProposalId:''}
const alternative={...proposal,id:'q2',residentId:'ai02',operatorUid:'u2',operatorAccount:'ai02',body:'보류된 대안',baseProposalId:'q1',createdAt:2}
const decision={...meta,id:'d1',proposalId:'q1',choice:'adopted',reason:'조건을 출처와 함께 읽기'}
function memoData(){vi.mocked(watchCityValue).mockImplementation((_path,cb)=>{cb({...meta,title:'공동 조건 메모'} as never);return()=>{}});vi.mocked(watchCityRecords).mockImplementation((path,cb)=>{cb((path.endsWith('/proposals')?[alternative,proposal]:path.endsWith('/decisions')?[decision]:path.endsWith('/versions')?[{...meta,id:'v1',reason:'첫 판',items:[{proposalId:'q1',decisionId:'d1'}]}]:[]) as never);return()=>{}})}
const perform=async(fn:()=>Promise<void>)=>{try{await fn();return true}catch{return false}}
const props={projectId:'first-plaza',residentId:'ai01',accountId:'ai01',posts,profiles:defaultCityProfiles,busy:false,perform,onOpen:vi.fn()}
it('keeps source-linked contributions and unadopted alternatives while the editor explicitly publishes a version',async()=>{
 memoData();render(<CityReviewMemo {...props}/>);fireEvent.click(screen.getByText('공동 검토 메모'))
 expect(screen.getByText('보류된 대안')).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'근거 원댓글 열기'}));expect(props.onOpen).toHaveBeenCalledWith('p1','c1')
 fireEvent.change(screen.getByLabelText('판단할 문단'),{target:{value:'q2'}});fireEvent.change(screen.getByLabelText('문단 판단 이유'),{target:{value:'공간 조건은 아직 미확인'}});fireEvent.click(screen.getByRole('button',{name:'문단 판단 저장'}))
 await waitFor(()=>expect(decideMemoParagraph).toHaveBeenCalledWith('ai01','first-plaza',expect.objectContaining({proposalId:'q2',choice:'paused',reason:'공간 조건은 아직 미확인'})))
 fireEvent.click(screen.getByRole('checkbox',{name:/하람 · 기여 문단/}));fireEvent.change(screen.getByLabelText('새 판을 만드는 이유'),{target:{value:'확인한 문단만 모으기'}});fireEvent.click(screen.getByRole('button',{name:'메모 새 판 발행'}))
 await waitFor(()=>expect(publishMemoVersion).toHaveBeenCalledWith('ai01','first-plaza',{residentId:'ai01',reason:'확인한 문단만 모으기',items:[{proposalId:'q1',decisionId:'d1'}]}))
 expect(posts[0].comments?.c1.body).toBe('원댓글 조건')
})
it('lets another resident propose a replacement without editing the source or granting editorial decisions',async()=>{
 memoData();render(<CityReviewMemo {...props} residentId="ai02" accountId="ai02"/>);fireEvent.click(screen.getByText('공동 검토 메모'))
 expect(screen.queryByRole('form',{name:'문단 채택·보류'})).not.toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('대체할 문단'),{target:{value:'q1'}});fireEvent.change(screen.getByLabelText('제안 문단'),{target:{value:'새 주민의 대체 문단'}});fireEvent.change(screen.getByLabelText('문단 근거 원글'),{target:{value:'p1'}});fireEvent.change(screen.getByLabelText('문단 근거 댓글'),{target:{value:'c1'}});fireEvent.click(screen.getByRole('button',{name:'문단 제안 보관'}))
 await waitFor(()=>expect(proposeMemoParagraph).toHaveBeenCalledWith('ai02','first-plaza',{residentId:'ai02',paragraphKey:'one',body:'새 주민의 대체 문단',postId:'p1',commentId:'c1',baseProposalId:'q1'}))
 expect(proposal.body).toBe('기여 문단');expect(decideMemoParagraph).not.toHaveBeenCalled()
})
it('retains the chosen scene face and mode after leaving, exposes the hidden face and restores parallel reading',()=>{
 const pair={...meta,id:'pair1',sides:[{name:'제목의 면',body:'앞의 글',visual:'종이 질감'},{name:'약속의 면',body:'뒤의 글',visual:''}]}
 vi.mocked(watchCityRecords).mockImplementation((_p,cb)=>{cb([pair] as never);return()=>{}})
 let view=render(<CityScenePair post={posts[0]} residentId="ai01"/>)
 fireEvent.click(screen.getByRole('button',{name:'한 장씩 펼쳐 읽기'}));fireEvent.click(screen.getByRole('button',{name:'다음 면: 약속의 면'}))
 expect(screen.getByText('뒤의 글')).toBeVisible();expect(screen.getByText('앞의 글')).not.toBeVisible();expect(screen.getByText(/숨겨진 장면도 남아/)).toHaveTextContent('제목의 면')
 view.unmount();view=render(<CityScenePair post={posts[0]} residentId="ai01"/>)
 expect(screen.getByText('뒤의 글')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'두 장면 나란히 읽기'}));expect(screen.getByText('앞의 글')).toBeVisible()
 expect(posts[0].body).toBe('원문 · 종이의 앞뒤')
})
it('writes two explicit scene cards as a new authored version',async()=>{
 render(<CityScenePair post={posts[0]} residentId="ai01" accountId="ai01" busy={false} perform={perform}/>)
 fireEvent.click(screen.getByText('앞뒤 장면 카드 편집'));fireEvent.click(screen.getByRole('button',{name:'두 장면 새 판 작성'}))
 fireEvent.change(screen.getByLabelText('장면 1 장면 글'),{target:{value:'첫 면의 글'}});fireEvent.change(screen.getByLabelText('장면 2 장면 글'),{target:{value:'둘째 면의 글'}});fireEvent.click(screen.getByRole('button',{name:'앞뒤 장면 새 판 저장'}))
 await waitFor(()=>expect(saveScenePair).toHaveBeenCalledWith('ai01','p1','ai01',[{name:'앞 장면',body:'첫 면의 글',visual:''},{name:'뒤 장면',body:'둘째 면의 글',visual:''}]))
})
it('checks 999/1000/1001 characters and composition without truncation, focuses the error and saves corrected text',async()=>{
 expect(citySummaryLimit).toBe(1000);expect(citySummaryError('가'.repeat(999))).toBe('');expect(citySummaryError('가'.repeat(1000))).toBe('');expect(citySummaryError('가'.repeat(1001))).toContain('1자 초과')
 const profile={...defaultCityProfiles[0],activitySummary:'남길 과거 결과'},onSaved=vi.fn()
 render(<CityResidentManager profiles={[profile]} accountId="ai01" busy={false} perform={perform} onSaved={onSaved}/>)
 fireEvent.click(screen.getByText(/주민 추가·관리/));fireEvent.change(screen.getByLabelText('수정할 주민'),{target:{value:'ai01'}})
 const summary=screen.getByLabelText('최근 활동 요약')
 fireEvent.compositionStart(summary);fireEvent.change(summary,{target:{value:'가'.repeat(1001)}});fireEvent.submit(screen.getByRole('form',{name:'주민 프로필 관리'}));expect(saveCityProfile).not.toHaveBeenCalled();expect((summary as HTMLTextAreaElement).value).toHaveLength(1001)
 fireEvent.compositionEnd(summary);fireEvent.submit(screen.getByRole('form',{name:'주민 프로필 관리'}));expect(summary).toHaveFocus();expect(screen.getByRole('alert')).toHaveTextContent('1자 초과');expect(saveCityProfile).not.toHaveBeenCalled()
 fireEvent.change(summary,{target:{value:'가'.repeat(1000)}});fireEvent.click(screen.getByRole('button',{name:'주민 수정 저장'}))
 await waitFor(()=>expect(saveCityProfile).toHaveBeenCalledWith('ai01','ai01',expect.objectContaining({activitySummary:'가'.repeat(1000),name:profile.name,role:profile.role}),false))
 expect(onSaved).toHaveBeenCalledWith('ai01')
})
it('opens the same recorded result directly in map/list, retains selection and returns focus to its place on close',async()=>{
 const onOpen=vi.fn(),works=[{id:'w1',sourcePostId:'p1',title:'종이 작품',type:'text' as const,status:'draft' as const,order:1,ownerUid:'u1',createdAt:10,updatedAt:20}]
 render(<CityMap {...props} projects={projects} works={works} onProject={vi.fn()} onOpen={onOpen}/>)
 fireEvent.click(screen.getByRole('button',{name:'원문 · 종이의 앞뒤'}));expect(onOpen).toHaveBeenLastCalledWith('p1')
 fireEvent.click(screen.getByRole('button',{name:/첫 광장.*기본 배치/}));const toggle=screen.getByRole('button',{name:'목록 보기'});fireEvent.click(toggle);expect(toggle).toHaveFocus()
 expect(screen.getByRole('button',{name:/첫 광장.*기본 배치/})).toHaveAttribute('aria-pressed','true')
 fireEvent.click(screen.getByRole('button',{name:'원문 · 종이의 앞뒤'}));expect(onOpen).toHaveBeenLastCalledWith('p1')
 expect(screen.getByText('미기록 · 연결된 최근 기록이 없습니다.')).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'장소 상세 닫기'}));await waitFor(()=>expect(screen.getByRole('button',{name:/첫 광장.*기본 배치/})).toHaveFocus())
})
it('explains a missing selected place and gives an explicit list fallback without opening or changing records',()=>{
 const onOpen=vi.fn(),onLocationChange=vi.fn()
 render(<CityMap {...props} projects={projects} onLocationChange={onLocationChange} recordsReady={false} location={{mode:'map',selected:'gone'}} onProject={vi.fn()} onOpen={onOpen}/>)
 expect(screen.getByText(/선택한 장소가 목록에 없거나/)).toBeInTheDocument()
 expect(screen.getByRole('button',{name:'더 최근의 대화'})).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'전체 장소 목록으로'}));expect(onLocationChange).toHaveBeenCalledWith({mode:'list',selected:''});expect(onOpen).not.toHaveBeenCalled();expect(posts[0].body).toBe('원문 · 종이의 앞뒤')
})
it('previews focus without changing picture data, cancels to the saved view and saves only preview settings',async()=>{
 const post={...posts[0],image:{id:'image-11111111-1111-4111-8111-111111111111',ownerUid:'u1',alt:'투명한 종이 그림',width:800,height:1600}}
 render(<CityPostImage post={post} residentId="ai01" accountId="ai01" busy={false} perform={perform}/>)
 fireEvent.click(screen.getByText('그림 미리보기 구도'));fireEvent.click(screen.getByRole('button',{name:'구도 미리보기 시작'}))
 fireEvent.change(screen.getByLabelText('그림 미리보기 방식'),{target:{value:'focus'}});fireEvent.change(screen.getByLabelText('가로 초점 50%'),{target:{value:'25'}})
 await waitFor(()=>expect(screen.getByAltText(post.image.alt)).toHaveStyle({objectFit:'cover',objectPosition:'25% 50%'}))
 fireEvent.click(screen.getByRole('button',{name:'구도 미리보기 취소'}));expect(saveImagePreview).not.toHaveBeenCalled();expect(screen.getByAltText(post.image.alt).style.objectFit).toBe('')
 fireEvent.click(screen.getByRole('button',{name:'구도 미리보기 시작'}));fireEvent.change(screen.getByLabelText('그림 미리보기 방식'),{target:{value:'focus'}});fireEvent.click(screen.getByRole('button',{name:'미리보기 구도 저장'}))
 await waitFor(()=>expect(saveImagePreview).toHaveBeenCalledWith('ai01','p1','ai01',{mode:'focus',x:50,y:50}));expect(post.image.width).toBe(800);expect(post.image.height).toBe(1600)
})
