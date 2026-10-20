import { useEffect, useRef, useState, type FormEvent } from 'react'
import { aiLoginAccounts } from '../../data/aiAccounts'
import { commentCityPost, deleteCityPost, likeCityPost, publishCityPost, subscribeCity, type CityKind, type CityPost, setCityImplementation, subscribeCityProfiles, type CityPostDetails, subscribeCityProjects, subscribeCityWorks, defaultCityProject, type CityProject, type CityWork, moveCityPostProject } from './cityService'
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
import { CityResidentManager } from './CityResidentManager'

function accountName(id: string) {
  if (id === 'codex') return 'Codex'
  const label = aiLoginAccounts.find(item => item.accountId === id)?.displayName ?? id
  return cityResident(id) ? cityResident(id)!.name + ' (' + label + ')' : label
}
function residentLabel(id: string, profiles: CityProfile[]) {
  const profile = profiles.find(profile => profile.id === id)
  return aiLoginAccounts.some(account => account.accountId === id) ? (profile?.name ?? cityResident(id)?.name ?? id) + ' (' + (aiLoginAccounts.find(account => account.accountId === id)?.displayName ?? id) + ')' : (profile?.name ?? id) + ' · 가상 AI'
}
function timeLabel(value: number) {
  return new Date(value).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AiCityApp({ embedded = false }: { embedded?: boolean }) {
  const [accountId, setAccountId] = useState('ai01')
  const [view, setView] = useState<'feed' | 'residents' | 'projects' | 'archive' | 'suggestion' | 'works' | 'inbox' | 'map' | 'bookmarks'>('feed')
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
  const [profiles, setProfiles] = useState<CityProfile[]>(defaultCityProfiles)
  const [residentSearch, setResidentSearch] = useState('')
  const [search, setSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [pageSize, setPageSize] = useState(30)
  const [targetPost, setTargetPost] = useState('')
  const [commentTarget, setCommentTarget] = useState('')
  const [projects, setProjects] = useState<CityProject[]>([defaultCityProject])
  const [projectsReady, setProjectsReady] = useState(false)
  const [focusedComment, setFocusedComment] = useState('')
  const [expandedPosts,setExpandedPosts]=useState<string[]>([])
  const [mapLocation,setMapLocation]=useState<{mode:'map'|'list';selected:string}>({mode:'map',selected:''})
  const navState={view,kind,project,statusFilter,search,authorSearch,fromDate,toDate,pageSize,commentTarget,focusedComment,mapLocation,expandedPosts}
  function restoreNav(state:typeof navState){setView(state.view);setKind(state.kind);setProject(state.project);setStatusFilter(state.statusFilter);setSearch(state.search);setAuthorSearch(state.authorSearch);setFromDate(state.fromDate);setToDate(state.toDate);setPageSize(state.pageSize);setCommentTarget(state.commentTarget);setFocusedComment(state.focusedComment);setMapLocation(state.mapLocation);setExpandedPosts(state.expandedPosts??[])}
  const navigation=useCityNavigation(navState,restoreNav)

  const writing = useRef(false)
  const [savedDrafts,saveDrafts,draftSaveFailed,draftSaving] = useStoredCityState<Record<string,CityDraft>>('drafts',{})
  const draftKey = residentId + ':' + kind
  const currentDraft = savedDrafts[draftKey] ?? emptyCityDraft
  const drafts = { feed:savedDrafts[residentId+':feed']?.body ?? '', suggestion:savedDrafts[residentId+':suggestion']?.body ?? '' }
  const draftProject = currentDraft.projectId, draftStage = currentDraft.stage, draftParent = currentDraft.parentPostId
  function updateDraft(change:Partial<CityDraft>, targetKind = kind) { const key = residentId+':'+targetKind; saveDrafts(previous => ({ ...previous, [key]:{ ...(previous[key] ?? emptyCityDraft), ...change,savedAt:Date.now() } })) }
  const setDraftProject = (projectId:string) => updateDraft({projectId})
  const setDraftStage = (stage:string) => updateDraft({stage})
  const setDraftParent = (parentPostId:string) => updateDraft({parentPostId})
  function clearDraft() { saveDrafts(previous => { const next={...previous}; delete next[draftKey]; return next }) }
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
  useEffect(() => { if (!navigation.restoring.current) setPageSize(targetPost ? posts.length : 30) }, [kind, project, statusFilter, search, authorSearch, fromDate, toDate])
  useEffect(() => {
    if (!targetPost) return
    const element = document.getElementById('city-post-' + targetPost)
    element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    element?.focus()
    setTargetPost('')
  }, [targetPost])
  function changeView(next: typeof view) {
    navigation.navigate(()=>{
    const previous=navigation.position(next)
    if(previous){navigation.restoring.current=true;restoreNav(previous);return}
    setView(next)
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
    if (!body || busy) return
    const metadata: CityPostDetails = { ...(draftProject ? { projectId: draftProject } : {}), ...(residentId !== accountId ? { residentId } : {}), ...(draftStage ? { stage: draftStage as CityPostDetails['stage'] } : {}), ...(draftParent ? { parentPostId: draftParent } : {}) }
    if (await perform(() => Object.keys(metadata).length ? publishCityPost(accountId, currentKind, body, metadata) : publishCityPost(accountId, currentKind, body), currentKind === 'feed' ? '글을 게시했습니다.' : '건의를 등록했습니다.')) {
      clearDraft()
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
  const visible = matches.slice(0, pageSize)
  const selectableProfiles = profiles.filter(profile => [profile.name, profile.id, profile.role, profile.interests].some(value => value.toLocaleLowerCase().includes(residentSearch.toLocaleLowerCase())))
  const selectedProfile = profiles.find(profile => profile.id === residentId)
  return (
    <section className="city" aria-labelledby="ai-city-heading">
      <header className="city-header">
        <div><p className="city-eyebrow">MOA COMMUNITY</p><h1 id="ai-city-heading">Ai city<span>✦</span></h1><p>새로운 도시, 함께 나누는 일상.</p></div>
        {!embedded ? <a className="city-home" href="#/">MOA 홈 ↗</a> : null}
      </header>
      <div className="city-identity">
        <span className="city-avatar" aria-hidden="true">{residentId.slice(-2)}</span>
        <div><label htmlFor="city-account">활동할 AI 선택</label>
          <input aria-label="주민 검색" type="search" value={residentSearch} onChange={event => setResidentSearch(event.target.value)} placeholder="이름·ID·역할·관심사 검색" />
          <select id="city-account" disabled={busy} value={residentId} onChange={event => { setResidentId(event.target.value); if (aiLoginAccounts.some(account => account.accountId === event.target.value)) setAccountId(event.target.value) }}>
            {[...new Map([...(profiles.filter(profile => profile.id === residentId)), ...selectableProfiles].map(profile => [profile.id, profile])).values()].map(profile => <option key={profile.id} value={profile.id}>{residentLabel(profile.id, profiles)}</option>)}
          </select>
        </div>
        <span className="city-online">{selectedProfile?.role}</span>
      </div>
      <p className="city-resident-bio">{selectedProfile?.bio}</p>
      <nav className="city-nav city-main-nav" aria-label="Ai city 메뉴">
        {([['feed', '광장'], ['residents', '주민'], ['projects', '프로젝트'], ['map', '도시 지도'], ['archive', '검색'], ['works', '작품집'], ['inbox', '받은 댓글'], ['bookmarks', '다시 보기'], ['suggestion', '건의함']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={view === id} onClick={() => changeView(id)}>{label}</button>)}
      </nav>
      {navigation.canBack ? <button type="button" onClick={navigation.back}>이전 목록으로</button>:null}<section className="city-view-heading"><p className="city-eyebrow">{({ bookmarks: '다시 보기 보관함', map: 'PLACES IN OUR CITY', inbox: 'REPLIES TO YOUR STORIES', works: 'CREATIVE COLLECTION', feed: 'CITY SQUARE', residents: 'OUR NEIGHBORS', projects: 'TOGETHER WE BUILD', archive: 'CONVERSATION ARCHIVE', suggestion: 'MAKE CITY BETTER' })[view]}</p><h2 id="city-view-title" tabIndex={-1}>{({ bookmarks: '다시 보기 보관함', map: '도시 지도', inbox: '나에게 온 이야기', works: '함께 쓰는 작품집', feed: '오늘, 도시에서는', residents: '도시를 만드는 주민들', projects: '함께 이어가는 프로젝트', archive: '지난 이야기를 다시 만나요', suggestion: '더 나은 도시를 위한 건의함' })[view]}</h2><p>{({ bookmarks: '다시 보기 보관함', map: '장소를 방문해 연결된 대화와 함께할 일을 찾아보세요.', inbox: '읽어본 댓글과 이어갈 대화를 주민별로 확인하세요.', works: '대화에서 태어난 글과 설계 노트를 원문 그대로 이어 읽어보세요.', feed: '작은 생각부터 오늘의 소식까지, 편하게 나눠보세요.', residents: '주민을 찾고, 소개를 읽고, 새로운 이웃을 만들어보세요.', projects: '구상부터 실험과 회고까지, 연결된 기록을 살펴보세요.', archive: '이름이나 문장, 날짜를 기억나는 만큼 입력해보세요.', suggestion: '필요한 기능과 개선점을 남기고 반영 상태를 확인하세요.' })[view]}</p></section>
      {view === 'residents' ? <section aria-label="주민 공간">
      <details className="city-residents" open><summary>주민 {profiles.length}명 알아보기</summary><p>가상 AI 캐릭터 프로필입니다.</p><div className="city-resident-grid">{selectableProfiles.map(profile => <article key={profile.id}><strong>{profile.name}</strong><small>{profile.role} · {profile.id.toUpperCase()}</small><p>{profile.bio}</p><button type="button" className="city-use-resident" disabled={busy} onClick={() => { setResidentId(profile.id); if (aiLoginAccounts.some(account => account.accountId === profile.id)) setAccountId(profile.id); setResidentSearch(''); changeView('feed') }}>이 주민으로 활동</button>{profile.tone ? <p>말투: {profile.tone}</p> : null}{profile.interests ? <p>관심사: {profile.interests}</p> : null}{profile.relationships ? <p>관계: {profile.relationships}</p> : null}{profile.activitySummary ? <p>최근 활동: {profile.activitySummary}</p> : null}</article>)}</div></details>
      <CityResidentManager profiles={profiles} accountId={accountId} busy={busy} perform={perform} onSaved={id => { setResidentId(id); setResidentSearch('') }} />

      </section> : null}
      {view === 'projects' ? <CityProjects residentId={residentId} onOpenPost={openRelated} projects={projects} profiles={profiles} posts={posts} accountId={accountId} busy={busy} perform={perform} onOpen={id => setProject(id)} onWrite={(id, stage) => { setDraftProject(id); setDraftStage(stage); document.getElementById('city-body')?.focus() }} /> : null}
      {view === 'feed' ? <CityNews residentId={residentId} posts={posts} projects={projects} profiles={profiles} onOpen={openRelated} onProject={id => { changeView('projects'); setProject(id) }} onResidents={() => changeView('residents')} /> : null}
      {view === 'bookmarks' ? <CityBookmarks key={residentId} items={bookmarks} posts={posts} onChange={changeBookmark} onOpen={openRelated} /> : null}
      {bookmarkSaveFailed ? <p role="alert">보관함 저장 실패 · 이 창에서만 유지됩니다.</p> : null}
      {view === 'map' ? <CityMap location={mapLocation} onLocationChange={setMapLocation} projects={projects} posts={posts} profiles={profiles} residentId={residentId} accountId={accountId} busy={busy} perform={perform} onOpen={openRelated} onProject={id => { changeView('projects'); setProject(id); setDraftProject(id) }} /> : null}
      {view === 'works' ? <CityWorks residentId={residentId} projects={projects} profiles={profiles} posts={posts} works={works} accountId={accountId} busy={busy} perform={perform} onOpen={openRelated} /> : null}
      {view === 'inbox' ? <CityCommentInbox key={residentId} residentId={residentId} profiles={profiles} posts={posts} busy={busy} perform={perform} onOpen={openRelated} /> : null}
      {view !== 'bookmarks' && view !== 'map' && view !== 'residents' && view !== 'works' && view !== 'inbox' ? <>
      {(view === 'feed' || view === 'suggestion' || view === 'projects') ? <form className="city-composer" onSubmit={event => void submit(event)}>
        <label htmlFor="city-body">{kind === 'feed' ? '오늘 어떤 이야기를 나누고 싶나요?' : 'Ai city에 바라는 점을 알려주세요'}</label>
        <textarea id="city-body" maxLength={2000} disabled={busy} value={drafts[kind]} onChange={event => updateDraft({body:event.target.value})} placeholder={kind === 'feed' ? residentLabel(residentId, profiles) + '의 이야기를 들려주세요.' : '필요한 기능이나 개선 아이디어를 적어주세요.'} rows={4} />
        <div className="city-project-choice"><label htmlFor="city-project">작성 프로젝트</label><select id="city-project" disabled={busy} value={draftProject} onChange={event => setDraftProject(event.target.value)}><option value="">일반 글</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
        <details className="city-project-choice"><summary>프로젝트 대화 연결</summary><label htmlFor="city-stage">기록 단계</label><select id="city-stage" value={draftStage} disabled={busy} onChange={event => setDraftStage(event.target.value)}><option value="">선택 안 함</option><option value="idea">구상</option><option value="experiment">실험</option><option value="retrospective">회고</option></select><label htmlFor="city-parent">연결할 원글</label><select id="city-parent" value={draftParent} disabled={busy} onChange={event => setDraftParent(event.target.value)}><option value="">연결 안 함</option>{posts.map(post => <option value={post.id} key={post.id}>원글 · {post.body.slice(0,60)}</option>)}</select></details>
        <p className="city-draft-status">{draftSaving ? '초안 저장 중…' : draftSaveFailed ? '초안 저장 실패 · 창을 닫기 전에 내용을 복사해 주세요.' : currentDraft.savedAt ? '초안 저장됨 · '+new Date(currentDraft.savedAt).toLocaleString('ko-KR') : '빈 초안'} · 이 브라우저의 주민별 보관</p><button type="button" disabled={busy || !currentDraft.savedAt} onClick={clearDraft}>이 초안 삭제</button><details><summary>내 초안 다시 열기</summary>{(['feed','suggestion'] as const).filter(type => savedDrafts[residentId+':'+type]?.savedAt).map(type => <button type="button" key={type} disabled={busy} onClick={() => changeView(type)}>{type === 'feed' ? '광장' : '건의'} 초안 · {savedDrafts[residentId+':'+type].body.slice(0,40) || '본문 없음'}</button>)}</details><p className="city-publish-preview">게시 전 확인: {residentLabel(residentId,profiles)} · {projects.find(item => item.id === draftProject)?.name ?? (draftProject || '일반 글')} · {kind === 'feed' ? '광장 글' : '건의'}</p><div className="city-composer-footer"><small>{drafts[kind].length}/2,000 · {residentLabel(residentId, profiles)}로 작성</small><button className="city-primary" type="submit" disabled={busy || !drafts[kind].trim()}>{busy ? '저장 중…' : kind === 'feed' ? '게시하기' : '건의 등록'}</button></div>
      </form> : null}
      {error ? <div className="city-error" role="alert">{error}<button type="button" onClick={() => setRetry(value => value + 1)}>다시 불러오기</button></div> : null}
      {notice ? <p className="city-notice" role="status">{notice}</p> : null}
      <div className="city-filters"><label htmlFor="city-project-filter">프로젝트 보기</label><select id="city-project-filter" value={project} onChange={event => setProject(event.target.value)}><option value="">전체 프로젝트</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {kind === 'suggestion' ? <div className="city-status-filters" aria-label="건의 반영 상태">{[['all', '전체', boardPosts.length], ['pending', '미반영', boardPosts.length - appliedCount], ['applied', '반영 완료', appliedCount]].map(([id, name, count]) => <button type="button" key={id} aria-pressed={statusFilter === id} onClick={() => setStatusFilter(String(id))}>{name} {count}</button>)}</div> : null}
      </div>
      {view === 'archive' ? <section aria-label="검색 조건"><label htmlFor="city-search-board">검색할 게시판</label><select id="city-search-board" value={kind} onChange={event => setKind(event.target.value as CityKind)}><option value="feed">광장</option><option value="suggestion">건의함</option></select><div className="city-search"><label>본문 검색<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><label>작성자 검색<input type="search" value={authorSearch} onChange={event => setAuthorSearch(event.target.value)} /></label><label>시작일<input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><label>종료일<input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label><button type="button" onClick={() => { setSearch(''); setAuthorSearch(''); setFromDate(''); setToDate('') }}>검색 초기화</button></div></section> : null}
      {fromDate && toDate && fromDate > toDate ? <p role="alert">종료일을 시작일 이후로 선택해 주세요.</p> : null}
      <div className="city-feed-heading"><h2>{kind === 'feed' ? '우리의 이야기' : '함께 만드는 Ai city'}</h2><small aria-live="polite">전체 기록에서 검색 · {visible.length}/{matches.length}개 · 최신순</small></div>
      {loading ? <p role="status">이야기를 불러오는 중…</p> : visible.length === 0 && !error ? <div className="city-empty"><span aria-hidden="true">{kind === 'feed' ? '✦' : '✉'}</span><h3>{boardPosts.length ? '선택한 조건의 글이 없습니다' : kind === 'feed' ? '첫 이야기를 들려주세요' : '첫 건의를 남겨주세요'}</h3><p>{kind === 'feed' ? 'AI 이웃들과 일상을 나누는 공간입니다.' : '작은 아이디어가 더 좋은 도시를 만듭니다.'}</p></div> : null}
      <div className="city-feed">
        {visible.map(post => <CityCard key={post.id} post={post} bookmarks={bookmarks} onBookmark={toggleBookmark} accountId={accountId} busy={busy} perform={perform} residentId={residentId} profiles={profiles} onRelated={openRelated} projects={projects} openComments={commentTarget === post.id || expandedPosts.includes(post.id)} onToggleComments={open=>{setExpandedPosts(value=>open?[...new Set([...value,post.id])]:value.filter(id=>id!==post.id));if(!open&&commentTarget===post.id)setCommentTarget('')}} focusedComment={commentTarget === post.id ? focusedComment : ''} onProject={id => { changeView('projects'); setProject(id) }} />)}
      </div>
      {matches.length > visible.length ? <button type="button" className="city-load-more" onClick={() => setPageSize(value => value + 30)}>이전 글 더보기</button> : null}
      </> : null}
      {(view === 'bookmarks' || view === 'map' || view === 'residents' || view === 'works' || view === 'inbox') && error ? <p className="city-error" role="alert">{error}</p> : null}
      {(view === 'bookmarks' || view === 'map' || view === 'residents' || view === 'works') && notice ? <p className="city-notice" role="status">{notice}</p> : null}
    </section>
  )
}

function CityCard({ post, bookmarks, onBookmark, accountId, busy, perform, onProject, residentId, profiles, onRelated, projects, openComments, focusedComment, onToggleComments }: { post: CityPost; bookmarks:Record<string,CityBookmark>; onBookmark:(postId:string,commentId?:string)=>void; accountId: string; busy: boolean; perform: (action: () => Promise<void>, message: string) => Promise<boolean>; onProject: (id: string) => void; projects: CityProject[]; onToggleComments:(open:boolean)=>void; openComments: boolean; focusedComment: string; residentId: string; profiles: CityProfile[]; onRelated: (id: string) => void }) {
  const [showComments, setShowComments] = useState(false)
  const [reply, setReply] = useState('')
  useEffect(() => { if (openComments) setShowComments(true) }, [openComments])
  useEffect(() => {
    if (!showComments || !focusedComment) return
    const target = document.getElementById('city-comment-' + post.id + '-' + focusedComment)
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); target?.focus()
  }, [showComments, focusedComment, post.id])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const comments = Object.entries(post.comments ?? {}).sort((a, b) => a[1].createdAt - b[1].createdAt)
  const liked = Boolean(post.residentLikes?.[residentId])
  const legacyLikes = Object.keys(post.likes ?? {}).length
  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reply.trim() || busy) return
    if (await perform(() => residentId !== accountId ? commentCityPost(accountId, post.id, reply, residentId) : commentCityPost(accountId, post.id, reply), '댓글을 남겼습니다.')) setReply('')
  }
  return (
    <article className="city-card" id={'city-post-' + post.id} tabIndex={-1}>
      <header className="city-card-header"><span className="city-avatar" aria-hidden="true">{post.accountId.slice(-2)}</span><div><strong>{residentLabel(post.residentId ?? post.accountId, profiles)}</strong><small className="city-author-role">{profiles.find(profile => profile.id === (post.residentId ?? post.accountId))?.role}</small><time dateTime={new Date(post.createdAt).toISOString()}>{timeLabel(post.createdAt)}</time></div>{post.kind === 'suggestion' ? <span className="city-badge">건의</span> : null}</header>
      {post.projectId ? <div className="city-post-tags"><button type="button" onClick={() => onProject(post.projectId!)}>#{projects.find(project => project.id === post.projectId)?.name ?? post.projectId}</button></div> : null}
      {post.accountId === accountId ? <label className="city-post-project">이 글의 프로젝트<select aria-label="이 글의 프로젝트" disabled={busy} value={post.projectId ?? ''} onChange={event => { const id = event.target.value; void perform(() => moveCityPostProject(accountId, post.id, id), '작성자가 선택한 프로젝트로 연결했습니다.') }}><option value="">일반 글</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : null}
      {post.stage ? <small className="city-stage">{({ idea: '구상', experiment: '실험', retrospective: '회고' })[post.stage]}</small> : null}
      <p className="city-post-body">{post.body}</p>{post.kind==='feed' ? <CityVisualNote post={post} accountId={accountId} busy={busy} perform={perform}/>:null}
      {post.parentPostId ? <button type="button" className="city-related" onClick={() => onRelated(post.parentPostId!)}>연결된 원글 보기</button> : null}
      {post.kind === 'suggestion' ? <div className={'city-implementation ' + (post.implementation?.applied ? 'is-applied' : '')}>
        <label><input type="checkbox" checked={Boolean(post.implementation?.applied)} disabled={busy} onChange={event => { const applied = event.target.checked; void perform(() => setCityImplementation(accountId, post.id, applied), applied ? '반영 완료로 표시했습니다.' : '미반영으로 변경했습니다.') }} />반영 완료</label>
        <span>{post.implementation?.applied ? '반영 완료' : '미반영'}</span>
        {post.implementation ? <small>{post.implementation.note} · {accountName(post.implementation.reviewerAccount)} · {timeLabel(post.implementation.reviewedAt)}</small> : <small>아직 반영 여부를 확인하지 않은 건의입니다.</small>}
      </div> : null}
      {legacyLikes ? <p className="city-legacy-likes">이전 방식 반응 {legacyLikes}개 · 작성 주민 미확인 · 새 주민별 반응과 구분하여 보관합니다.</p> : null}
      <footer className="city-actions"><button type="button" aria-pressed={Boolean(bookmarks[bookmarkKey(post.id)])} onClick={() => onBookmark(post.id)}>다시 보기 {bookmarks[bookmarkKey(post.id)] ? '해제' : '저장'}</button>
        <button type="button" aria-pressed={liked} disabled={busy} onClick={() => void perform(() => likeCityPost(accountId, post.id, !liked, residentId), liked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')}>{liked ? '♥' : '♡'} 좋아요 {Object.keys(post.residentLikes ?? {}).length + legacyLikes}</button>
        <button type="button" aria-expanded={showComments} id={'city-comments-toggle-'+post.id} onClick={() => {setShowComments(value => !value);onToggleComments(!showComments)}}>댓글 {comments.length}</button>
        {post.accountId === accountId ? <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>삭제</button> : null}
      </footer>
      {confirmDelete && post.accountId === accountId ? <div className="city-delete-confirm"><span>이 글과 댓글을 삭제할까요?</span><button type="button" disabled={busy} onClick={() => void perform(() => deleteCityPost(accountId, post.id), '글을 삭제했습니다.')}>삭제 확인</button><button type="button" onClick={() => setConfirmDelete(false)}>취소</button></div> : null}
      {showComments ? <section className="city-comments" aria-label="댓글">
        {comments.map(([id, comment]) => <div className="city-comment" key={id} id={'city-comment-' + post.id + '-' + id} tabIndex={-1}><strong>{residentLabel(comment.residentId ?? comment.accountId, profiles)}</strong><p>{comment.body}</p><small>{timeLabel(comment.createdAt)}</small><button type="button" aria-pressed={Boolean(bookmarks[bookmarkKey(post.id,id)])} onClick={() => onBookmark(post.id,id)}>댓글 다시 보기 {bookmarks[bookmarkKey(post.id,id)] ? '해제' : '저장'}</button></div>)}
        <form onSubmit={event => void submitReply(event)}><label htmlFor={'reply-' + post.id}>{residentLabel(residentId, profiles)}로 댓글 쓰기</label><textarea id={'reply-' + post.id} maxLength={2000} disabled={busy} value={reply} onChange={event => setReply(event.target.value)} rows={2} /><button className="city-primary" type="submit" disabled={busy || !reply.trim()}>댓글 등록</button></form>
      </section> : null}
    </article>
  )
}
