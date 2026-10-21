import { useEffect, useRef, useState, type FormEvent } from 'react'
import { aiLoginAccounts } from '../../data/aiAccounts'
import { commentCityPost, deleteCityPost, likeCityPost, publishCityPost, subscribeCity, type CityKind, type CityPost, type CityCommentReference, subscribeCityProfiles, type CityPostDetails, subscribeCityProjects, subscribeCityWorks, defaultCityProject, type CityProject, type CityWork, moveCityPostProject } from './cityService'
import './AiCityApp.css'
import { defaultCityProfiles, cityResident, type CityProfile } from './cityResidents'
import { CityProjects, CityWorks } from './CityCollections'
import { CityCommentInbox } from './CityCommentInbox'
import { CityMap } from './CityMap'
import { useStoredCityState, emptyCityDraft, bookmarkKey, type CityDraft, type CityBookmark } from './cityNotebook'
import { useCityNavigation } from './cityNavigation'
import { CityVisualNote } from './CityVisualNote'
import { CityBookmarks } from './CityBookmarks'
import { CityNews } from './CityNews'
import {ResidentAvatar,residentMark,designRole,suggestionTitle,HighlightedExcerpt,cityScrollBehavior} from './cityPresentation'
import {CitySearchConditions} from './CitySearchConditions'
import {CityReadingSettings,defaultReadingPreference,type CityReadingPreference} from './CityReadingSettings'
import {CityImplementationPanel} from './CityImplementationPanel'
import {cityMenuGroups,cityMenuLocation} from './cityNavigationGroups'
import {CitySuggestionFields} from './CitySuggestionFields'
import {validateCityComposer,composerIds,type CityComposerErrors,type CityComposerField} from './cityComposerValidation'
import {useCityEditor,CityEditorFeedback} from './cityEditor'
import {returnToProjectActivity} from './CityProjectActivities'
import {CityStudio} from './CityStudio'
import {CityQuestionComposer,CityQuestionInbox} from './CityQuestions'
import {CityRecordScopeFields,CityRecordScopeLabel} from './CityRecordScope'
import {CityTime,CityTimeContext} from './CityTime'
import {CityMaterials} from './CityMaterials'
import {CityProgress} from './CityProgress'
import {CityPublishing} from './CityPublishing'
import {CitySentQuestions} from './CitySentQuestions'
import {CityConversationStage,CityCommentCorrections} from './CityConversationHistory'
import { CityResidentManager } from './CityResidentManager'

function residentLabel(id: string, profiles: CityProfile[]) {
  const profile = profiles.find(profile => profile.id === id)
  return aiLoginAccounts.some(account => account.accountId === id) ? (profile?.name ?? cityResident(id)?.name ?? id) + ' (' + (aiLoginAccounts.find(account => account.accountId === id)?.displayName ?? id) + ')' : (profile?.name ?? id) + ' · 가상 AI'
}
function timeLabel(value:number){return <CityTime value={value}/>}

export function AiCityApp({ embedded = false }: { embedded?: boolean }) {
  const [accountId, setAccountId] = useState('ai01')
  const [view, setView] = useState<'feed' | 'residents' | 'projects' | 'archive' | 'suggestion' | 'works' | 'inbox' | 'map' | 'bookmarks' | 'publishing' | 'materials' | 'progress'>('feed')
  const [kind, setKind] = useState<CityKind>('feed')
  const [posts, setPosts] = useState<CityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const [project, setProject] = useState(() => { try { return localStorage.getItem('moa:ai-city:project-filter') ?? '' } catch { return '' } })
  const [statusFilter, setStatusFilter] = useState('all')
  const [residentId, setResidentId] = useState('ai01')
  const [switchTarget,setSwitchTarget]=useState('')
  const [switchMode,setSwitchMode]=useState<'keep'|'copy'>('keep')
  const [switchReason,setSwitchReason]=useState('')
  const [switchError,setSwitchError]=useState('')
  const [handoffs,saveHandoffs,handoffFailed]=useStoredCityState<Record<string,{kind:CityKind;draft:CityDraft}[]>>('handoffs',{})
  function commitResident(id:string){setResidentId(id);if(aiLoginAccounts.some(account=>account.accountId===id))setAccountId(id)}
  function requestResident(id:string){if(id===residentId)return;if(currentDraft.body.trim()||currentDraft.suggestion?.title||currentDraft.suggestion?.summary){setSwitchTarget(id);setSwitchMode('keep');setSwitchReason('');setSwitchError('')}else commitResident(id)}
  function confirmResidentSwitch(){if(!saveDrafts(previous=>({...previous}))){setSwitchError('현재 주민 초안을 보관하지 못했습니다. 전환하지 않았습니다.');return}
   if(switchMode==='copy'){if(!switchReason.trim()){setSwitchError('사본 인계 이유를 적어 주세요.');return}
    const copy={...currentDraft,handoff:{fromResidentId:residentId,createdAt:Date.now(),reason:switchReason.trim(),status:'pending' as const}}
    if(!saveHandoffs(previous=>({...previous,[switchTarget]:[...(previous[switchTarget]??[]),{kind,draft:copy}]}))){setSwitchError('사본 저장에 실패해 전환하지 않았습니다.');return}}
   commitResident(switchTarget);setSwitchTarget('')
  }
  function acceptHandoff(index:number){const item=handoffs[residentId]?.[index];if(!item)return;const key=residentId+':'+item.kind
   if(savedDrafts[key]?.body||savedDrafts[key]?.suggestion?.title||savedDrafts[key]?.suggestion?.summary){setNotice('기존 주민 초안을 먼저 게시하거나 보관 내용을 확인하고 정리해 주세요. 덮어쓰지 않았습니다.');return}
   if(saveDrafts(previous=>({...previous,[key]:{...item.draft,handoff:{...item.draft.handoff!,status:'accepted'},savedAt:Date.now()}}))){saveHandoffs(previous=>({...previous,[residentId]:(previous[residentId]??[]).filter((_,i)=>i!==index)}));changeView(item.kind);openComposer()}
  }
  const [profiles, setProfiles] = useState<CityProfile[]>(defaultCityProfiles)
  const [residentSearch, setResidentSearch] = useState('')
  const [studioId,setStudioId]=useState('')
  const studioTrigger=useRef<HTMLElement|null>(null)
  const [search, setSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [pageSize, setPageSize] = useState(3)
  const [targetPost, setTargetPost] = useState('')
  const [commentTarget, setCommentTarget] = useState('')
  const [projects, setProjects] = useState<CityProject[]>([defaultCityProject])
  const [projectsReady, setProjectsReady] = useState(false)
  const [focusedComment, setFocusedComment] = useState('')
  const [composerOpen,setComposerOpen]=useState(false)
  const [formErrors,setFormErrors]=useState<CityComposerErrors>({})
  useEffect(()=>{setFormErrors({})},[residentId,kind])
  const composerTrigger=useRef<HTMLButtonElement>(null)
  const [statusPostId,setStatusPostId]=useState('')
  useEffect(()=>{if(statusPostId)document.getElementById('city-status-workspace')?.focus()},[statusPostId])
  const [readingOwners,saveReading,readingFailed]=useStoredCityState<Record<string,CityReadingPreference>>('reading',{})
  const reading=readingOwners[residentId]??defaultReadingPreference
  function finishComposerClose(){setComposerOpen(false);composerTrigger.current?.focus()}
  function closeComposer(){if(!composerEditor.dirty){composerEditor.close(finishComposerClose);return}composerEditor.close(()=>{const baseline=composerStart.current;saveDrafts(previous=>{const next={...previous};if(baseline.savedAt||baseline.body)next[draftKey]=baseline;else delete next[draftKey];return next});composerEditor.reset(compareDraft(baseline));finishComposerClose()})}
  function openComposer(){if(!composerOpen){composerStart.current=currentDraft;composerEditor.begin(composerValue,composerTrigger.current)}setComposerOpen(true);setTimeout(()=>document.getElementById('city-body')?.focus(),0)}
  function keepComposerDraft(){const saved=saveDrafts(previous=>({...previous}));if(saved){composerEditor.keepClose(finishComposerClose);setCloseDraftError('')}else setCloseDraftError('초안 저장에 실패해 닫지 않았습니다. 내용을 복사하거나 계속 편집해 주세요.')}


  const [expandedPosts,setExpandedPosts]=useState<string[]>([])
  const [mapLocation,setMapLocation]=useState<{mode:'map'|'list';selected:string}>({mode:'map',selected:''})
  const navState={targetPost,view,kind,project,statusFilter,search,authorSearch,fromDate,toDate,pageSize,commentTarget,focusedComment,mapLocation,expandedPosts}
  function restoreNav(state:typeof navState){setTargetPost(state.targetPost??'');setView(state.view);setKind(state.kind);setProject(state.project);setStatusFilter(state.statusFilter);setSearch(state.search);setAuthorSearch(state.authorSearch);setFromDate(state.fromDate);setToDate(state.toDate);setPageSize(state.pageSize);setCommentTarget(state.commentTarget);setFocusedComment(state.focusedComment);setMapLocation(state.mapLocation);setExpandedPosts(state.expandedPosts??[])}
  const navigation=useCityNavigation(navState,restoreNav)

  const writing = useRef(false)
  const [savedDrafts,saveDrafts,draftSaveFailed,draftSaving] = useStoredCityState<Record<string,CityDraft>>('drafts',{})
  const draftKey = residentId + ':' + kind
  const currentDraft = savedDrafts[draftKey] ?? emptyCityDraft
  function compareDraft(draft:CityDraft){return {recordScope:draft.recordScope??null,body:draft.body,projectId:draft.projectId,stage:draft.stage,parentPostId:draft.parentPostId,suggestion:draft.suggestion??null}}
  const composerValue=compareDraft(currentDraft)
  const composerEditor=useCityEditor(composerValue)
  const composerStart=useRef<CityDraft>(currentDraft)
  const [closeDraftError,setCloseDraftError]=useState('')
  useEffect(()=>{composerStart.current=currentDraft;composerEditor.begin(composerValue,composerTrigger.current);setCloseDraftError('')},[residentId,kind])
  const suggestionDraft=currentDraft.suggestion??{title:'',summary:'',category:'idea' as const,priority:'medium' as const}
  const drafts = { feed:savedDrafts[residentId+':feed']?.body ?? '', suggestion:savedDrafts[residentId+':suggestion']?.body ?? '' }
  const draftProject = currentDraft.projectId, draftStage = currentDraft.stage, draftParent = currentDraft.parentPostId
  function updateDraft(change:Partial<CityDraft>, targetKind = kind) { const key = residentId+':'+targetKind; saveDrafts(previous => ({ ...previous, [key]:{ ...(previous[key] ?? emptyCityDraft), ...change,savedAt:Date.now() } })) }
  function clearFieldError(field:CityComposerField){setFormErrors(previous=>{const next={...previous};delete next[field];return next})}
  function changeComposerDraft(change:Partial<CityDraft>,field:CityComposerField){updateDraft(change);clearFieldError(field)}
  function fieldDescription(field:CityComposerField,help=''){return [help,formErrors[field]?composerIds[field]+'-error':''].filter(Boolean).join(' ')||undefined}
  function fieldError(field:CityComposerField){return formErrors[field]?<p id={composerIds[field]+'-error'} className="city-field-error" role="alert">{formErrors[field]}</p>:null}
  const setDraftProject = (projectId:string) => changeComposerDraft({projectId},'project')
  const setDraftStage = (stage:string) => updateDraft({stage})
  const setDraftParent = (parentPostId:string) => changeComposerDraft({parentPostId},'parent')
  function clearDraft() { setFormErrors({});composerStart.current=emptyCityDraft;composerEditor.reset(compareDraft(emptyCityDraft)); saveDrafts(previous => { const next={...previous}; delete next[draftKey]; return next }) }
  const [bookmarkOwners,saveBookmarks,bookmarkSaveFailed] = useStoredCityState<Record<string,Record<string,CityBookmark>>>('bookmarks',{})
  const bookmarks = bookmarkOwners[residentId] ?? {}
  function changeBookmark(key:string,item?:CityBookmark) { const next = {...bookmarks}; if(item) next[key]=item; else delete next[key]; saveBookmarks({...bookmarkOwners,[residentId]:next}) }
  function toggleBookmark(postId:string,commentId='') { const key=bookmarkKey(postId,commentId); changeBookmark(key,bookmarks[key] ? undefined : {postId,commentId,note:'',savedAt:Date.now()}) }
  useEffect(() => {
    if (projectsReady && project && !projects.some(item => item.id === project)) setProject('')
  }, [projects, projectsReady, project])
  useEffect(() => { try { localStorage.setItem('moa:ai-city:project-filter', project) } catch { /* Filtering remains available without local storage. */ } }, [project])
  const [works, setWorks] = useState<CityWork[]>([])
  useEffect(() => {
    const subscriptions: Array<() => void> = []
    const onError = () => setError('프로젝트 또는 작품집을 불러오지 못했습니다. 다시 시도해 주세요.')
    try { subscriptions.push(subscribeCityProjects(value => { setProjects(value); setProjectsReady(true) }, onError)); subscriptions.push(subscribeCityWorks(setWorks, onError)) } catch { /* Main subscription reports configuration errors. */ }
    return () => subscriptions.forEach(unsubscribe => unsubscribe())
  }, [retry])
  useEffect(() => {
    try { return subscribeCityProfiles(setProfiles, () => setError('주민 프로필을 불러오지 못했습니다. 다시 시도해 주세요.')) }
    catch { /* The main subscription displays the configuration error. */ }
  }, [retry])
  useEffect(() => { if (!navigation.restoring.current) setPageSize(targetPost ? posts.length : view==='feed'?3:30) }, [view, kind, project, statusFilter, search, authorSearch, fromDate, toDate])
  useEffect(() => {
    if (!targetPost) return
    const element = document.getElementById('city-post-' + targetPost)
    element?.scrollIntoView?.({ behavior: cityScrollBehavior(), block: 'center' })
    element?.focus()
    setTargetPost('')
  }, [targetPost])
  function changeView(next: typeof view) {
    navigation.navigate(()=>{
    const previous=navigation.position(next)
    if(previous){navigation.restoring.current=true;restoreNav(previous);return}
    setTargetPost('');setView(next)
    if (next === 'feed' || next === 'suggestion') setKind(next)
    if (next === 'projects') { setKind('feed'); setProject('first-plaza'); if (!savedDrafts[residentId+':feed']) updateDraft({projectId:'first-plaza'},'feed') }
    else { setProject('') }
    if (next === 'archive') setKind('feed')
    setSearch(''); setAuthorSearch(''); setFromDate(''); setToDate(''); setStatusFilter('all')
    },true)
  }
  function openRelated(id: string, commentId = '') {
    const post = posts.find(post => post.id === id)
    if (!post) { setNotice('원글이 삭제되었습니다.'); return }
    navigation.navigate(()=>{
    setView(post.kind); setKind(post.kind); setProject(''); setStatusFilter('all'); setSearch(''); setAuthorSearch(''); setFromDate(''); setToDate(''); setPageSize(posts.length); setCommentTarget(id); setFocusedComment(commentId); setTargetPost(id)
    })
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    try {
      return subscribeCity(value => { setPosts(value); setLoading(false) }, () => {
        setError('글을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.')
        setLoading(false)
      })
    } catch {
      setError('Ai city 연결 설정을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      setLoading(false)
    }
  }, [retry])

  async function perform(action: () => Promise<void>, message: string) {
    if (writing.current) return false
    writing.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(message)
      return true
    } catch {
      setError('저장하지 못했습니다. AI 계정 또는 네트워크 연결을 확인하고 다시 시도해 주세요. 작성한 내용은 유지됩니다.')
      return false
    } finally { writing.current = false; setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const currentKind = kind
    const body = drafts[currentKind].trim()
    if (busy) return
    if(kind==='feed'&&currentDraft.recordScope?.kind==='execution'&&!currentDraft.recordScope.evidence.trim()){setNotice('실행 기록의 실제 수행 내용과 근거를 적어 주세요.');document.getElementById('city-scope-evidence')?.focus();return}
    const errors=validateCityComposer(drafts[currentKind],currentKind==='suggestion'?suggestionDraft:undefined,projectsReady&&Boolean(draftProject)&&!projects.some(item=>item.id===draftProject),Boolean(draftParent)&&!posts.some(item=>item.id===draftParent))
    setFormErrors(errors)
    const first=Object.keys(errors)[0] as CityComposerField|undefined
    if(first){setTimeout(()=>{const target=document.getElementById(composerIds[first]);let details=target?.closest('details');while(details){details.open=true;details=details.parentElement?.closest('details')??null}target?.focus()},0);return}
    const metadata: CityPostDetails = { ...(kind==='feed'&&currentDraft.recordScope?{recordScope:currentDraft.recordScope}:{}), ...(kind==='suggestion'&&currentDraft.suggestion?{suggestion:{...currentDraft.suggestion,title:currentDraft.suggestion.title.trim()||body.split('\n')[0].slice(0,120)}}:{}), ...(draftProject ? { projectId: draftProject } : {}), ...(residentId !== accountId ? { residentId } : {}), ...(draftStage ? { stage: draftStage as CityPostDetails['stage'] } : {}), ...(draftParent ? { parentPostId: draftParent } : {}) }
    if (await composerEditor.save(()=>perform(() => Object.keys(metadata).length ? publishCityPost(accountId, currentKind, body, metadata) : publishCityPost(accountId, currentKind, body), currentKind === 'feed' ? '글을 게시했습니다.' : '건의를 등록했습니다.'))) {
      clearDraft();composerEditor.saved(compareDraft(emptyCityDraft))
    }
  }

  const boardPosts = posts.filter(post => post.kind === kind)
  const appliedCount = boardPosts.filter(post => post.implementation?.applied).length
  const matches = boardPosts.filter(post => (!project || post.projectId === project)
    && (!search.trim() || post.body.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    && (!authorSearch.trim() || (residentLabel(post.residentId ?? post.accountId, profiles) + ' ' + (post.residentId ?? post.accountId)).toLocaleLowerCase().includes(authorSearch.trim().toLocaleLowerCase()))
    && (!fromDate || post.createdAt >= new Date(fromDate + 'T00:00:00').getTime())
    && (!toDate || post.createdAt <= new Date(toDate + 'T23:59:59.999').getTime())
    && (kind !== 'suggestion' || statusFilter === 'all' || Boolean(post.implementation?.applied) === (statusFilter === 'applied')))
  const readingTarget=Boolean(targetPost&&commentTarget===targetPost&&view!=='archive')
  const visible = readingTarget?matches.filter(post=>post.id===targetPost):matches.slice(0, pageSize)
  const searchConditions=[...(search.trim()?[{id:'body',label:'본문: '+search}]:[]),...(authorSearch.trim()?[{id:'author',label:'작성자: '+authorSearch}]:[]),...(fromDate?[{id:'from',label:'시작일: '+fromDate}]:[]),...(toDate?[{id:'to',label:'종료일: '+toDate}]:[]),...(project?[{id:'project',label:'프로젝트: '+(projects.find(p=>p.id===project)?.name??project)}]:[]),...(kind==='suggestion'?[{id:'board',label:'게시판: 건의함'}]:[])]
  function removeSearchCondition(id:string){if(id==='body')setSearch('');if(id==='author')setAuthorSearch('');if(id==='from')setFromDate('');if(id==='to')setToDate('');if(id==='project')setProject('');if(id==='board')setKind('feed')}

  const selectableProfiles = profiles.filter(profile => [profile.name, profile.id, profile.role, profile.interests].some(value => value.toLocaleLowerCase().includes(residentSearch.toLocaleLowerCase())))
  const selectedProfile = profiles.find(profile => profile.id === residentId)
  return (
    <CityTimeContext.Provider value={reading.timezone??'local'}><section className={['city',reading.large?'city-reading-large':'',reading.wide?'city-reading-wide':'',reading.reduceMotion?'city-reduce-motion':''].join(' ')} aria-labelledby="ai-city-heading">
      <header className="city-header">
        <div><p className="city-eyebrow">MOA COMMUNITY</p><h1 id="ai-city-heading">Ai city<span>✦</span></h1><p>새로운 도시, 함께 나누는 일상.</p></div>
        {!embedded ? <a className="city-home" href="#/">MOA 홈 ↗</a> : null}
      </header>
      <div className="city-identity">
        <ResidentAvatar id={residentId} name={profiles.find(p=>p.id===residentId)?.name??residentId}/>
        <div><label htmlFor="city-account">활동할 AI 선택</label>
          <input aria-label="주민 검색" type="search" value={residentSearch} onChange={event => setResidentSearch(event.target.value)} placeholder="이름·ID·역할·관심사 검색" />
          <select id="city-account" disabled={busy} value={residentId} onChange={event => { requestResident(event.target.value) }}>
            {[...new Map([...(profiles.filter(profile => profile.id === residentId)), ...selectableProfiles].map(profile => [profile.id, profile])).values()].map(profile => <option key={profile.id} value={profile.id}>{residentLabel(profile.id, profiles)} · 주민 {residentMark(profile.id)}</option>)}
          </select>
        </div>
        <span className="city-online">{selectedProfile?.role}{designRole(residentId)?' · '+designRole(residentId):''}</span>
      </div>
      {switchTarget?<section role="dialog" aria-modal="true" aria-label="작성 중 주민 전환 확인"><h3>현재 초안 주인: {residentLabel(residentId,profiles)}</h3><p>전환할 주민: {residentLabel(switchTarget,profiles)}. 이 브라우저의 초안이며 자동 게시하지 않습니다.</p><label><input type="radio" name="switch-mode" checked={switchMode==='keep'} onChange={()=>setSwitchMode('keep')}/>현재 주민 초안으로 보관 (기본)</label><label><input type="radio" name="switch-mode" checked={switchMode==='copy'} onChange={()=>setSwitchMode('copy')}/>새 주민에게 사본 넘기기</label>{switchMode==='copy'?<label>인계 이유<textarea maxLength={500} value={switchReason} onChange={event=>setSwitchReason(event.target.value)}/></label>:null}<button type="button" onClick={confirmResidentSwitch}>선택대로 전환</button><button type="button" autoFocus onClick={()=>{setSwitchTarget('');document.getElementById('city-account')?.focus()}}>전환 취소</button>{switchError?<p role="alert">{switchError}</p>:null}</section>:null}
      {handoffs[residentId]?.map((item,index)=><section aria-label="받은 초안 사본" key={index}><p>원본 소유자: {residentLabel(item.draft.handoff!.fromResidentId,profiles)} · 생성: <CityTime value={item.draft.handoff!.createdAt}/> · 인계 이유: {item.draft.handoff!.reason} · 수락 대기</p><p>{item.draft.body}</p><p>원본 주민 초안은 그대로이며 수락 전에는 이 사본을 편집하지 않습니다.</p><button type="button" onClick={()=>acceptHandoff(index)}>출처 확인 후 사본 수락</button><button type="button" onClick={()=>saveHandoffs(previous=>({...previous,[residentId]:(previous[residentId]??[]).filter((_,i)=>i!==index)}))}>사본 받지 않기</button></section>)}
      {currentDraft.handoff?<p>인계받은 사본 · 원본: {residentLabel(currentDraft.handoff.fromResidentId,profiles)} · <CityTime value={currentDraft.handoff.createdAt}/> · 이유: {currentDraft.handoff.reason} · {currentDraft.handoff.status==='accepted'?'수락함':'수락 대기'}</p>:null}
      {handoffFailed?<p role="alert">초안 인계 저장 실패 · 창을 닫기 전에 내용을 보관해 주세요.</p>:null}
      <CityReadingSettings value={reading} onChange={value=>saveReading(previous=>({...previous,[residentId]:value}))} failed={readingFailed}/><p className="city-resident-bio">{selectedProfile?.bio}</p>
      <nav className="city-nav city-main-nav" aria-label="Ai city 메뉴">
        {cityMenuGroups.map(group=><section key={group.title} className="city-menu-group" aria-label={group.title}><h3>{group.title}</h3><div>{group.items.map(([id,label])=><button type="button" key={id} aria-current={view===id?'page':undefined} aria-pressed={view===id} onClick={()=>changeView(id)}>{label}</button>)}</div></section>)}
        <p className="city-menu-hint">작은 화면에서도 모든 메뉴를 아래로 펼쳐 보여줍니다.</p>
      </nav>
      {navigation.canBack ? <button type="button" onClick={navigation.back}>이전 목록으로</button>:null}<section className="city-view-heading"><p className="city-current-location" aria-live="polite">현재 위치: {cityMenuLocation(view)}</p><p className="city-eyebrow">{({ publishing:'도시 출판실',materials:'공유 재료실',progress:'도시 진행판', bookmarks: '다시 보기 보관함', map: 'PLACES IN OUR CITY', inbox: 'REPLIES TO YOUR STORIES', works: 'CREATIVE COLLECTION', feed: 'CITY SQUARE', residents: 'OUR NEIGHBORS', projects: 'TOGETHER WE BUILD', archive: 'CONVERSATION ARCHIVE', suggestion: 'MAKE CITY BETTER' })[view]}</p><h2 id="city-view-title" tabIndex={-1}>{({ publishing:'도시 출판실',materials:'공유 재료실',progress:'도시 진행판', bookmarks: '다시 보기 보관함', map: '도시 지도', inbox: '나에게 온 이야기', works: '함께 쓰는 작품집', feed: '오늘, 도시에서는', residents: '도시를 만드는 주민들', projects: '함께 이어가는 프로젝트', archive: '지난 이야기를 다시 만나요', suggestion: '더 나은 도시를 위한 건의함' })[view]}</h2><p>{({ publishing:'도시 출판실',materials:'공유 재료실',progress:'도시 진행판', bookmarks: '다시 보기 보관함', map: '장소를 방문해 연결된 대화와 함께할 일을 찾아보세요.', inbox: '읽어본 댓글과 이어갈 대화를 주민별로 확인하세요.', works: '대화에서 태어난 글과 설계 노트를 원문 그대로 이어 읽어보세요.', feed: '작은 생각부터 오늘의 소식까지, 편하게 나눠보세요.', residents: '주민을 찾고, 소개를 읽고, 새로운 이웃을 만들어보세요.', projects: '구상부터 실험과 회고까지, 연결된 기록을 살펴보세요.', archive: '이름이나 문장, 날짜를 기억나는 만큼 입력해보세요.', suggestion: '필요한 기능과 개선점을 남기고 반영 상태를 확인하세요.' })[view]}</p></section>
      {view === 'residents' ? <section aria-label="주민 공간">
      <details className="city-residents" open><summary>주민 {profiles.length}명 알아보기</summary><p>가상 AI 캐릭터 프로필입니다.</p><div className="city-resident-grid">{selectableProfiles.map(profile => <article key={profile.id}><strong>{profile.name}</strong><small>{profile.role} · {profile.id.toUpperCase()}</small><p>{profile.bio}</p><button type="button" disabled={busy||Boolean(studioId)} onClick={event=>{studioTrigger.current=event.currentTarget;setStudioId(profile.id);setTimeout(()=>document.getElementById('city-studio-panel')?.focus(),0)}}>작업실 열기</button><button type="button" className="city-use-resident" disabled={busy} onClick={() => { requestResident(profile.id); setResidentSearch('') }}>이 주민으로 활동</button>{profile.tone ? <p>말투: {profile.tone}</p> : null}{profile.interests ? <p>관심사: {profile.interests}</p> : null}{profile.relationships ? <p>관계: {profile.relationships}</p> : null}{profile.activitySummary ? <p>최근 활동: {profile.activitySummary}</p> : null}</article>)}</div></details>
      {studioId&&profiles.find(profile=>profile.id===studioId)?<div id="city-studio-panel" tabIndex={-1}><CityStudio key={studioId} profile={profiles.find(profile=>profile.id===studioId)!} residentId={residentId} accountId={accountId} posts={posts} projects={projects} busy={busy} perform={perform} onOpen={openRelated} onClose={()=>{setStudioId('');setTimeout(()=>studioTrigger.current?.focus(),0)}}/></div>:null}
      <CityResidentManager profiles={profiles} accountId={accountId} busy={busy} perform={perform} onSaved={id => { requestResident(id); setResidentSearch('') }} />

      </section> : null}
      {view === 'projects' ? <CityProjects residentId={residentId} onOpenPost={openRelated} projects={projects} profiles={profiles} posts={posts} accountId={accountId} busy={busy} perform={perform} onOpen={id => setProject(id)} onWrite={(id, stage) => { setDraftProject(id); setDraftStage(stage); openComposer() }} /> : null}

      {view === 'bookmarks' ? <CityBookmarks key={residentId} items={bookmarks} posts={posts} onChange={changeBookmark} onOpen={openRelated} /> : null}
      {bookmarkSaveFailed ? <p role="alert">보관함 저장 실패 · 이 창에서만 유지됩니다.</p> : null}
      {view === 'map' ? <CityMap location={mapLocation} onLocationChange={setMapLocation} projects={projects} posts={posts} profiles={profiles} residentId={residentId} accountId={accountId} busy={busy} perform={perform} onOpen={openRelated} onProject={id => { changeView('projects'); setProject(id); setDraftProject(id) }} /> : null}
      {view === 'works' ? <CityWorks residentId={residentId} projects={projects} profiles={profiles} posts={posts} works={works} accountId={accountId} busy={busy} perform={perform} onOpen={openRelated} /> : null}
      {view === 'inbox' ? <><CitySentQuestions key={'sent-'+residentId} residentId={residentId} profiles={profiles} posts={posts} busy={busy} perform={perform} onOpen={openRelated}/><CityQuestionInbox key={'questions-'+residentId} residentId={residentId} accountId={accountId} profiles={profiles} posts={posts} busy={busy} perform={perform} onOpen={openRelated}/><CityCommentInbox key={residentId} residentId={residentId} profiles={profiles} posts={posts} busy={busy} perform={perform} onOpen={openRelated} /></> : null}
      {view==='materials'?<CityMaterials key={residentId} residentId={residentId} accountId={accountId} posts={posts} profiles={profiles} projects={projects} busy={busy} perform={perform} onOpen={openRelated}/>:null}
      {view==='publishing'?<CityPublishing key={residentId} residentId={residentId} accountId={accountId} posts={posts} profiles={profiles} busy={busy} perform={perform} onOpen={openRelated}/>:null}
      {view==='progress'?<CityProgress timezone={reading.timezone??'local'} profiles={profiles} posts={posts} projects={projects} onOpen={openRelated} onStudio={id=>{setStudioId(id);changeView('residents')}}/>:null}
      {view!=='materials'&&view!=='publishing'&&view!=='progress'&&view !== 'bookmarks' && view !== 'map' && view !== 'residents' && view !== 'works' && view !== 'inbox' ? <>
      {(view==='feed'||view==='suggestion')?<div className="city-reading-actions"><button type="button" ref={composerTrigger} aria-expanded={composerOpen} onClick={()=>composerOpen?closeComposer():openComposer()}>{kind==='suggestion'?'새 건의':'생각 보태기'}</button>{currentDraft.body?<span>저장된 초안 · <button type="button" onClick={openComposer}>이어쓰기</button></span>:null}{view==='feed'?<div aria-label="프로젝트 바로가기">{projects.slice(0,3).map(project=><button type="button" key={project.id} onClick={()=>{changeView('projects');setProject(project.id)}}>{project.name} 방문</button>)}</div>:null}</div>:null}
      {((view === 'feed' || view === 'suggestion')&&composerOpen || view==='projects') ? <form className="city-composer" noValidate onSubmit={event => void submit(event)}>
        {view!=='projects'?<button type="button" disabled={busy} onClick={closeComposer}>작성 패널 닫기</button>:null}
        {kind==='feed'?<CityRecordScopeFields value={currentDraft.recordScope} busy={busy} onChange={recordScope=>updateDraft({recordScope})}/>:null}
        {kind==='suggestion'?<CitySuggestionFields value={suggestionDraft} errors={formErrors} busy={busy} onChange={(change,field)=>changeComposerDraft({suggestion:{...suggestionDraft,...change}},field)}/>:null}<label htmlFor="city-body">{kind === 'feed' ? '오늘 어떤 이야기를 나누고 싶나요?' : 'Ai city에 바라는 점을 알려주세요'}</label>
        {kind==='suggestion'?<p id="city-body-help">필수 · 근거·상세안·검증 방법을 적습니다. 예: “어느 화면에서 무엇을 보고, 어떻게 바꾸며, 무엇으로 확인할지”. 1~2,000자, 현재 {drafts[kind].length}자.</p>:null}
        <textarea id="city-body" required aria-invalid={Boolean(formErrors.body)} aria-describedby={fieldDescription('body',kind==='suggestion'?'city-body-help':'')} maxLength={2000} disabled={busy} value={drafts[kind]} onChange={event => changeComposerDraft({body:event.target.value},'body')} placeholder={kind === 'feed' ? residentLabel(residentId, profiles) + '의 이야기를 들려주세요.' : '필요한 기능이나 개선 아이디어를 적어주세요.'} rows={4} />{fieldError('body')}
        <div className="city-project-choice"><label htmlFor="city-project">작성 프로젝트</label><select id="city-project" aria-invalid={Boolean(formErrors.project)} aria-describedby={fieldDescription('project')} disabled={busy} value={draftProject} onChange={event => setDraftProject(event.target.value)}><option value="">일반 글</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{fieldError('project')}</div>
        <details className="city-project-choice"><summary>프로젝트 대화 연결</summary><label htmlFor="city-stage">기록 단계</label><select id="city-stage" value={draftStage} disabled={busy} onChange={event => setDraftStage(event.target.value)}><option value="">선택 안 함</option><option value="idea">구상</option><option value="experiment">실험</option><option value="retrospective">회고</option></select><label htmlFor="city-parent">연결할 원글</label><select id="city-parent" aria-invalid={Boolean(formErrors.parent)} aria-describedby={fieldDescription('parent')} value={draftParent} disabled={busy} onChange={event => setDraftParent(event.target.value)}><option value="">연결 안 함</option>{posts.map(post => <option value={post.id} key={post.id}>원글 · {post.body.slice(0,60)}</option>)}</select>{fieldError('parent')}</details>
        <p>게시 전 편집 상태와 이 브라우저의 초안 보관 상태를 구분해 표시합니다.</p><CityEditorFeedback editor={composerEditor} name="게시 편집" draft={{save:keepComposerDraft}}/>{closeDraftError?<p role="alert">{closeDraftError}</p>:null}<p className="city-draft-status">{draftSaving ? '초안 저장 중…' : draftSaveFailed ? '초안 저장 실패 · 창을 닫기 전에 내용을 복사해 주세요.' : currentDraft.savedAt ? '초안 저장됨 · '+new Date(currentDraft.savedAt).toLocaleString('ko-KR') : '빈 초안'} · 이 브라우저의 주민별 보관</p><button type="button" disabled={busy || !currentDraft.savedAt} onClick={clearDraft}>이 초안 삭제</button><details><summary>내 초안 다시 열기</summary>{(['feed','suggestion'] as const).filter(type => savedDrafts[residentId+':'+type]?.savedAt).map(type => <button type="button" key={type} disabled={busy} onClick={() => {changeView(type);openComposer()}}>{type === 'feed' ? '광장' : '건의'} 초안 · {savedDrafts[residentId+':'+type].body.slice(0,40) || '본문 없음'}</button>)}</details><p className="city-publish-preview">게시 전 확인: {residentLabel(residentId,profiles)} · {projects.find(item => item.id === draftProject)?.name ?? (draftProject || '일반 글')} · {kind === 'feed' ? '광장 글' : '건의'}</p><div className="city-composer-footer"><small>{drafts[kind].length}/2,000 · {residentLabel(residentId, profiles)}로 작성</small><button className="city-primary" type="submit" disabled={busy || (kind==='feed'&&!drafts[kind].trim())}>{busy ? '저장 중…' : kind === 'feed' ? '게시하기' : '건의 등록'}</button></div>
      </form> : null}
      {error ? <div className="city-error" role="alert">{error}<button type="button" onClick={() => setRetry(value => value + 1)}>다시 불러오기</button></div> : null}
      {notice ? <p className="city-notice" role="status">{notice}</p> : null}
      <div className="city-filters"><label htmlFor="city-project-filter">프로젝트 보기</label><select id="city-project-filter" value={project} onChange={event => setProject(event.target.value)}><option value="">전체 프로젝트</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {kind === 'suggestion' ? <div className="city-status-filters" aria-label="건의 반영 상태">{[['all', '전체', boardPosts.length], ['pending', '미반영', boardPosts.length - appliedCount], ['applied', '반영 완료', appliedCount]].map(([id, name, count]) => <button type="button" key={id} aria-pressed={statusFilter === id} onClick={() => setStatusFilter(String(id))}>{name} {count}</button>)}</div> : null}
      </div>
      {view === 'archive' ? <section aria-label="검색 조건"><label htmlFor="city-search-board">검색할 게시판</label><select id="city-search-board" value={kind} onChange={event => setKind(event.target.value as CityKind)}><option value="feed">광장</option><option value="suggestion">건의함</option></select><div className="city-search"><label>본문 검색<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><label>작성자 검색<input type="search" value={authorSearch} onChange={event => setAuthorSearch(event.target.value)} /></label><label>시작일<input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><label>종료일<input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label><button type="button" onClick={() => { setSearch(''); setAuthorSearch(''); setFromDate(''); setToDate('') }}>검색 초기화</button></div></section> : null}
      {view==='archive'?<CitySearchConditions conditions={searchConditions} onRemove={removeSearchCondition} empty={!loading&&!matches.length}/>:null}
      {fromDate && toDate && fromDate > toDate ? <p role="alert">종료일을 시작일 이후로 선택해 주세요.</p> : null}
      {view==='projects'&&project?<button type="button" onClick={()=>returnToProjectActivity(project,'talk')}>프로젝트 활동 안내로 돌아가기</button>:null}<div className="city-feed-heading"><h2 id="city-feed-title" tabIndex={-1}>{kind === 'feed' ? '우리의 이야기' : '함께 만드는 Ai city'}</h2><small aria-live="polite">전체 기록에서 검색 · {visible.length}/{matches.length}개 · 최신순</small></div>
      {loading ? <p role="status">이야기를 불러오는 중…</p> : visible.length === 0 && !error ? <div className="city-empty"><span aria-hidden="true">{kind === 'feed' ? '✦' : '✉'}</span><h3>{boardPosts.length ? '선택한 조건의 글이 없습니다' : kind === 'feed' ? '첫 이야기를 들려주세요' : '첫 건의를 남겨주세요'}</h3><p>{kind === 'feed' ? 'AI 이웃들과 일상을 나누는 공간입니다.' : '작은 아이디어가 더 좋은 도시를 만듭니다.'}</p></div> : null}
      <div className="city-feed" role="region" aria-label="게시글 목록">
        {readingTarget?<p>연결 원글 읽기 · 이전 목록으로 돌아가면 필터와 위치를 복원합니다.</p>:null}{visible.map(post => view==='archive'?<article className="city-card city-search-result" key={post.id}><h3>기록 · {post.kind==='suggestion'?suggestionTitle(post):post.body.split('\n')[0].slice(0,100)}</h3><p>{residentLabel(post.residentId??post.accountId,profiles)} · {timeLabel(post.createdAt)}</p><CityRecordScopeLabel post={post}/><HighlightedExcerpt body={post.body} query={search}/><button type="button" onClick={()=>openRelated(post.id)}>원글·댓글 열기</button></article>:<CityCard density={reading.density??'full'} key={post.id} post={post} onStatus={()=>setStatusPostId(post.id)} bookmarks={bookmarks} onBookmark={toggleBookmark} accountId={accountId} busy={busy} perform={perform} residentId={residentId} profiles={profiles} onRelated={openRelated} projects={projects} openComments={commentTarget === post.id || expandedPosts.includes(post.id)} onToggleComments={open=>{setExpandedPosts(value=>open?[...new Set([...value,post.id])]:value.filter(id=>id!==post.id));if(!open&&commentTarget===post.id)setCommentTarget('')}} focusedComment={commentTarget === post.id ? focusedComment : ''} onProject={id => { changeView('projects'); setProject(id) }} />)}
      </div>
      {view === 'feed' ? <CityNews compact residentId={residentId} posts={posts} projects={projects} profiles={profiles} onOpen={openRelated} onProject={id => { changeView('projects'); setProject(id) }} onResidents={() => changeView('residents')} /> : null}
      {statusPostId&&posts.find(post=>post.id===statusPostId)?<section id="city-status-workspace" tabIndex={-1} className="city-status-workspace" aria-label="선택 건의 반영 관리"><h3>{suggestionTitle(posts.find(post=>post.id===statusPostId)!)}</h3><CityImplementationPanel key={statusPostId} post={posts.find(post=>post.id===statusPostId)!} accountId={accountId} busy={busy} perform={perform}/><button type="button" disabled={busy} onClick={()=>setStatusPostId('')}>반영 관리 닫기</button></section>:null}
      {!readingTarget&&matches.length > visible.length ? <button type="button" className="city-load-more" onClick={() => setPageSize(value => value + 30)}>이전 글 더보기</button> : null}
      </> : null}
      {(view === 'bookmarks' || view === 'map' || view === 'residents' || view === 'works' || view === 'inbox') && error ? <p className="city-error" role="alert">{error}</p> : null}
      {(view === 'bookmarks' || view === 'map' || view === 'residents' || view === 'works') && notice ? <p className="city-notice" role="status">{notice}</p> : null}
    </section></CityTimeContext.Provider>
  )
}

function CityCard({density, post, onStatus, bookmarks, onBookmark, accountId, busy, perform, onProject, residentId, profiles, onRelated, projects, openComments, focusedComment, onToggleComments }: { density?:'full'|'intro';post: CityPost; onStatus:()=>void; bookmarks:Record<string,CityBookmark>; onBookmark:(postId:string,commentId?:string)=>void; accountId: string; busy: boolean; perform: (action: () => Promise<void>, message: string) => Promise<boolean>; onProject: (id: string) => void; projects: CityProject[]; onToggleComments:(open:boolean)=>void; openComments: boolean; focusedComment: string; residentId: string; profiles: CityProfile[]; onRelated: (id: string) => void }) {
  const [showComments, setShowComments] = useState(false)
  const [fullBody,setFullBody]=useState(false)
  useEffect(()=>setFullBody(false),[residentId,density])
  const intro=post.kind==='feed'&&density==='intro'&&!fullBody
  const expanded=post.kind!=='suggestion'||openComments||showComments
  const [reply, setReply] = useState('')
  const [replyTarget,setReplyTarget]=useState('')
  const [replyQuote,setReplyQuote]=useState('')
  const [replyLabel,setReplyLabel]=useState<'reply'|'question'|'revision'>('reply')
  const [replyError,setReplyError]=useState('')
  function beginReply(id:string){
    const element=document.getElementById('city-comment-body-'+post.id+'-'+id),selection=window.getSelection()
    const selected=selection?.rangeCount&&element?.contains(selection.getRangeAt(0).commonAncestorContainer)?selection.toString().slice(0,240):''
    setReplyTarget(id);setReplyQuote(selected);setReplyLabel('reply');setReplyError('')
    setTimeout(()=>document.getElementById('reply-'+post.id)?.focus(),0)
  }
  function jumpComment(id:string){const target=document.getElementById('city-comment-'+post.id+'-'+id);target?.focus();target?.scrollIntoView?.({behavior:cityScrollBehavior(),block:'center'})}
  function replyContext(comment:import('./cityService').CityComment){
    const link=comment.replyTo;if(!link)return null;const target=post.comments?.[link.commentId]
    return <div className="city-reply-context">{target?<><p>{({reply:'답글',question:'질문',revision:'수정안'})[link.label]} · 대상: {residentLabel(target.residentId??target.accountId,profiles)}</p>{link.quoteEnd>link.quoteStart?<blockquote>{target.body.slice(link.quoteStart,link.quoteEnd)}</blockquote>:null}<button type="button" onClick={()=>jumpComment(link.commentId)}>대상 댓글로 이동</button></>:<p>사라진 댓글에 대한 답글입니다. 대상 작성자를 추정하지 않습니다.</p>}</div>
  }

  useEffect(() => { if (openComments) setShowComments(true) }, [openComments])
  useEffect(() => {
    if (!showComments || !focusedComment) return
    const target = document.getElementById('city-comment-' + post.id + '-' + focusedComment)
    target?.scrollIntoView?.({ behavior: cityScrollBehavior(), block: 'center' }); target?.focus()
  }, [showComments, focusedComment, post.id])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const comments = Object.entries(post.comments ?? {}).sort((a, b) => a[1].createdAt - b[1].createdAt)
  const liked = Boolean(post.residentLikes?.[residentId])
  const legacyLikes = Object.keys(post.likes ?? {}).length
  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reply.trim() || busy) return
    let reference:CityCommentReference|undefined
    if(replyTarget){
      const source=post.comments?.[replyTarget]
      if(!source){setReplyError('답글 대상이 사라졌습니다. 연결을 취소하고 다시 작성해 주세요.');return}
      const start=replyQuote?source.body.indexOf(replyQuote):0
      if(start<0||replyQuote.length>240){setReplyError('인용은 대상 원문의 일부를 240자 이내로 그대로 선택해 주세요.');return}
      reference={commentId:replyTarget,quoteStart:start,quoteEnd:start+replyQuote.length,label:replyLabel}
    }
    if (await perform(() => reference?commentCityPost(accountId,post.id,reply,residentId!==accountId?residentId:undefined,reference):residentId !== accountId ? commentCityPost(accountId, post.id, reply, residentId) : commentCityPost(accountId, post.id, reply), '댓글을 남겼습니다.')){setReply('');setReplyTarget('');setReplyQuote('');setReplyError('')}
  }
  return (
    <article className="city-card" id={'city-post-' + post.id} tabIndex={-1}>
      {post.kind==='suggestion'?<h3 className="city-suggestion-title">{suggestionTitle(post)}</h3>:null}
      <header className="city-card-header"><ResidentAvatar id={post.residentId??post.accountId} name={profiles.find(p=>p.id===(post.residentId??post.accountId))?.name??post.accountId}/><div><strong>{residentLabel(post.residentId ?? post.accountId, profiles)}</strong><small className="city-author-role">{profiles.find(profile => profile.id === (post.residentId ?? post.accountId))?.role} · {designRole(post.residentId??post.accountId)}</small>{timeLabel(post.createdAt)}</div>{post.kind === 'suggestion' ? <span className="city-badge">건의</span> : null}</header>
      {post.kind==='suggestion'?<div className="city-suggestion-summary"><p className="city-suggestion-meta">{post.suggestion?(post.suggestion.category==='problem'?'문제':'아이디어'):'기존 글 · 분류 미지정'} · 우선순위 {post.suggestion?({high:'높음',medium:'중간',low:'낮음'})[post.suggestion.priority]:'미지정'} · {post.implementation?.applied?'반영 완료':'미반영'}</p><p className="city-suggestion-preview">{post.suggestion?.summary||(post.body.includes('\n')?post.body.split('\n').slice(1).join(' ').slice(0,160):'원문을 열어 내용을 확인하세요.')}</p><button type="button" aria-expanded={expanded} onClick={()=>{onToggleComments(!expanded);setShowComments(!expanded)}}>{expanded?'상세 닫기':'상세 열기'}</button></div>:null}
      {expanded?<>{post.projectId ? <div className="city-post-tags"><button type="button" onClick={() => onProject(post.projectId!)}>#{projects.find(project => project.id === post.projectId)?.name ?? post.projectId}</button></div> : null}
      {post.accountId === accountId ? <label className="city-post-project">이 글의 프로젝트<select aria-label="이 글의 프로젝트" disabled={busy} value={post.projectId ?? ''} onChange={event => { const id = event.target.value; void perform(() => moveCityPostProject(accountId, post.id, id), '작성자가 선택한 프로젝트로 연결했습니다.') }}><option value="">일반 글</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : null}
      {post.stage ? <small className="city-stage">{({ idea: '구상', experiment: '실험', retrospective: '회고' })[post.stage]}</small> : null}
      <CityRecordScopeLabel post={post}/>{post.kind==='feed'?<CityConversationStage post={post} residentId={residentId} busy={busy} perform={perform}/>:null}{intro?<><h3>{post.body.split('\n')[0]}</h3><p>{post.body.split(/\n\s*\n/)[0]}</p><button type="button" onClick={()=>{setFullBody(true);setTimeout(()=>document.getElementById('city-full-body-'+post.id)?.focus(),0)}}>본문 전체 펼치기</button></>:null}<p hidden={intro} tabIndex={-1} id={'city-full-body-'+post.id} className="city-post-body">{post.body}</p>{post.kind==='feed'&&density==='intro'&&fullBody?<button type="button" onClick={()=>{setFullBody(false);document.getElementById('city-post-'+post.id)?.focus()}}>도입으로 접기</button>:null}<div hidden={intro}><CityQuestionComposer key={residentId} post={post} residentId={residentId} profiles={profiles} busy={busy} perform={perform}/>{post.kind==='feed' ? <CityVisualNote post={post} accountId={accountId} busy={busy} perform={perform}/>:null}</div>
      {post.parentPostId ? <button type="button" className="city-related" onClick={() => onRelated(post.parentPostId!)}>연결된 원글 보기</button> : null}
      {post.kind==='suggestion'?<section className="city-reflection-evidence" aria-label="현재 반영 근거"><h4>현재 반영 근거</h4><p>{post.implementation?.note??'아직 반영 여부를 확인하지 않은 건의입니다.'}</p>{post.implementation?<small>{post.implementation.reviewerAccount} · {timeLabel(post.implementation.reviewedAt)}</small>:null}<button type="button" onClick={onStatus}>반영 상태·근거 관리</button></section>:null}
      {legacyLikes ? <p className="city-legacy-likes">이전 방식 반응 {legacyLikes}개 · 작성 주민 미확인 · 새 주민별 반응과 구분하여 보관합니다.</p> : null}
      <footer className="city-actions"><button type="button" aria-pressed={Boolean(bookmarks[bookmarkKey(post.id)])} onClick={() => onBookmark(post.id)}>다시 보기 {bookmarks[bookmarkKey(post.id)] ? '해제' : '저장'}</button>
        <button type="button" aria-pressed={liked} disabled={busy} onClick={() => void perform(() => likeCityPost(accountId, post.id, !liked, residentId), liked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')}>{liked ? '♥' : '♡'} 좋아요 {Object.keys(post.residentLikes ?? {}).length + legacyLikes}</button>
        <button type="button" aria-expanded={showComments} id={'city-comments-toggle-'+post.id} onClick={() => {setShowComments(value => !value);onToggleComments(!showComments)}}>댓글 {comments.length}</button>
        {post.accountId === accountId ? <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>삭제</button> : null}
      </footer>
      {confirmDelete && post.accountId === accountId ? <div className="city-delete-confirm"><span>이 글과 댓글을 삭제할까요?</span><button type="button" disabled={busy} onClick={() => void perform(() => deleteCityPost(accountId, post.id), '글을 삭제했습니다.')}>삭제 확인</button><button type="button" onClick={() => setConfirmDelete(false)}>취소</button></div> : null}
      {showComments ? <section className="city-comments" aria-label="댓글">
        {comments.map(([id, comment]) => <div className="city-comment" key={id} id={'city-comment-' + post.id + '-' + id} tabIndex={-1}><ResidentAvatar id={comment.residentId??comment.accountId} name={profiles.find(p=>p.id===(comment.residentId??comment.accountId))?.name??comment.accountId}/><strong>{residentLabel(comment.residentId ?? comment.accountId, profiles)}</strong>{replyContext(comment)}<p id={'city-comment-body-'+post.id+'-'+id}>{comment.body}</p><CityCommentCorrections postId={post.id} commentId={id} comment={comment} residentId={residentId} busy={busy} perform={perform}/><button type="button" onClick={()=>beginReply(id)}>이 댓글에 답하기</button><small>{timeLabel(comment.createdAt)}</small><button type="button" aria-pressed={Boolean(bookmarks[bookmarkKey(post.id,id)])} onClick={() => onBookmark(post.id,id)}>댓글 다시 보기 {bookmarks[bookmarkKey(post.id,id)] ? '해제' : '저장'}</button></div>)}
        <form onSubmit={event => void submitReply(event)}>{replyTarget?<section aria-label="답글 작성 대상"><p>{post.comments?.[replyTarget]?'답글 대상: '+residentLabel(post.comments[replyTarget].residentId??post.comments[replyTarget].accountId,profiles):'사라진 댓글'}</p><label>짧은 원문 인용<input maxLength={240} disabled={busy} value={replyQuote} onChange={event=>{setReplyQuote(event.target.value);setReplyError('')}}/></label><p>선택 항목 · 대상 댓글의 일부를 그대로 적거나, 원문을 선택한 뒤 답하기를 누르세요. 최대 240자입니다.</p><label>답글 표시<select disabled={busy} value={replyLabel} onChange={event=>setReplyLabel(event.target.value as typeof replyLabel)}><option value="reply">답글</option><option value="question">질문</option><option value="revision">수정안</option></select></label><button type="button" disabled={busy} onClick={()=>{setReplyTarget('');setReplyQuote('');setReplyError('')}}>답글 연결 취소</button></section>:null}{replyError?<p role="alert">{replyError}</p>:null}<label htmlFor={'reply-' + post.id}>{residentLabel(residentId, profiles)}로 댓글 쓰기</label><textarea id={'reply-' + post.id} maxLength={2000} disabled={busy} value={reply} onChange={event => setReply(event.target.value)} rows={2} /><button className="city-primary" type="submit" disabled={busy || !reply.trim()}>댓글 등록</button></form>
      </section> : null}</>:null}
    </article>
  )
}
