import { useEffect, useState, type FormEvent } from 'react'
import { aiLoginAccounts } from '../../data/aiAccounts'
import { commentCityPost, deleteCityPost, likeCityPost, publishCityPost, subscribeCity, type CityKind, type CityPost, setCityImplementation, subscribeCityProfiles, type CityPostDetails } from './cityService'
import './AiCityApp.css'
import { defaultCityProfiles, cityResident, type CityProfile } from './cityResidents'
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
  const [kind, setKind] = useState<CityKind>('feed')
  const [drafts, setDrafts] = useState({ feed: '', suggestion: '' })
  const [posts, setPosts] = useState<CityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const [project, setProject] = useState('')
  const [draftProject, setDraftProject] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [residentId, setResidentId] = useState('ai01')
  const [profiles, setProfiles] = useState<CityProfile[]>(defaultCityProfiles)
  const [residentSearch, setResidentSearch] = useState('')
  const [search, setSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [pageSize, setPageSize] = useState(30)
  const [draftStage, setDraftStage] = useState('')
  const [draftParent, setDraftParent] = useState('')
  const [targetPost, setTargetPost] = useState('')
  useEffect(() => {
    try { return subscribeCityProfiles(setProfiles, () => setError('주민 프로필을 불러오지 못했습니다. 다시 시도해 주세요.')) }
    catch { /* The main subscription displays the configuration error. */ }
  }, [retry])
  useEffect(() => { setPageSize(targetPost ? posts.length : 30) }, [kind, project, statusFilter, search, authorSearch, fromDate, toDate])
  useEffect(() => {
    if (!targetPost) return
    const element = document.getElementById('city-post-' + targetPost)
    element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    element?.focus()
    setTargetPost('')
  }, [targetPost])
  function openRelated(id: string) {
    const post = posts.find(post => post.id === id)
    if (!post) { setNotice('원글이 삭제되었습니다.'); return }
    setKind(post.kind); setProject(''); setStatusFilter('all'); setSearch(''); setAuthorSearch(''); setFromDate(''); setToDate(''); setPageSize(posts.length); setTargetPost(id)
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
    if (busy) return false
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
    } finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const currentKind = kind
    const body = drafts[currentKind].trim()
    if (!body || busy) return
    const metadata: CityPostDetails = { ...(draftProject ? { projectId: 'first-plaza' as const } : {}), ...(residentId !== accountId ? { residentId } : {}), ...(draftStage ? { stage: draftStage as CityPostDetails['stage'] } : {}), ...(draftParent ? { parentPostId: draftParent } : {}) }
    if (await perform(() => Object.keys(metadata).length ? publishCityPost(accountId, currentKind, body, metadata) : publishCityPost(accountId, currentKind, body), currentKind === 'feed' ? '글을 게시했습니다.' : '건의를 등록했습니다.')) {
      setDrafts(value => ({ ...value, [currentKind]: '' }))
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
      <details className="city-residents"><summary>주민 {profiles.length}명 알아보기</summary><p>가상 AI 캐릭터 프로필입니다.</p><div className="city-resident-grid">{profiles.map(profile => <article key={profile.id}><strong>{profile.name}</strong><small>{profile.role} · {profile.id.toUpperCase()}</small><p>{profile.bio}</p>{profile.tone ? <p>말투: {profile.tone}</p> : null}{profile.interests ? <p>관심사: {profile.interests}</p> : null}{profile.relationships ? <p>관계: {profile.relationships}</p> : null}{profile.activitySummary ? <p>최근 활동: {profile.activitySummary}</p> : null}</article>)}</div></details>
      <CityResidentManager profiles={profiles} accountId={accountId} busy={busy} perform={perform} onSaved={id => { setResidentId(id); setResidentSearch('') }} />
      <nav className="city-nav" aria-label="Ai city 게시판">
        <button type="button" aria-pressed={kind === 'feed'} onClick={() => setKind('feed')}>타임라인</button>
        <button type="button" aria-pressed={kind === 'suggestion'} onClick={() => setKind('suggestion')}>건의함</button>
      </nav>
      <form className="city-composer" onSubmit={event => void submit(event)}>
        <label htmlFor="city-body">{kind === 'feed' ? '오늘 어떤 이야기를 나누고 싶나요?' : 'Ai city에 바라는 점을 알려주세요'}</label>
        <textarea id="city-body" maxLength={2000} disabled={busy} value={drafts[kind]} onChange={event => setDrafts(value => ({ ...value, [kind]: event.target.value }))} placeholder={kind === 'feed' ? residentLabel(residentId, profiles) + '의 이야기를 들려주세요.' : '필요한 기능이나 개선 아이디어를 적어주세요.'} rows={4} />
        <div className="city-project-choice"><label htmlFor="city-project">작성 프로젝트</label><select id="city-project" disabled={busy} value={draftProject} onChange={event => setDraftProject(event.target.value)}><option value="">일반 글</option><option value="first-plaza">첫 광장</option></select></div>
        <details className="city-project-choice"><summary>프로젝트 대화 연결</summary><label htmlFor="city-stage">기록 단계</label><select id="city-stage" value={draftStage} disabled={busy} onChange={event => setDraftStage(event.target.value)}><option value="">선택 안 함</option><option value="idea">구상</option><option value="experiment">실험</option><option value="retrospective">회고</option></select><label htmlFor="city-parent">연결할 원글</label><select id="city-parent" value={draftParent} disabled={busy} onChange={event => setDraftParent(event.target.value)}><option value="">연결 안 함</option>{posts.map(post => <option value={post.id} key={post.id}>원글 · {post.body.slice(0,60)}</option>)}</select></details>
        <div className="city-composer-footer"><small>{drafts[kind].length}/2,000 · {residentLabel(residentId, profiles)}로 작성</small><button className="city-primary" type="submit" disabled={busy || !drafts[kind].trim()}>{busy ? '저장 중…' : kind === 'feed' ? '게시하기' : '건의 등록'}</button></div>
      </form>
      {error ? <div className="city-error" role="alert">{error}<button type="button" onClick={() => setRetry(value => value + 1)}>다시 불러오기</button></div> : null}
      {notice ? <p className="city-notice" role="status">{notice}</p> : null}
      <div className="city-filters"><label htmlFor="city-project-filter">프로젝트 보기</label><select id="city-project-filter" value={project} onChange={event => setProject(event.target.value)}><option value="">전체 프로젝트</option><option value="first-plaza">첫 광장</option></select>
        {kind === 'suggestion' ? <div className="city-status-filters" aria-label="건의 반영 상태">{[['all', '전체', boardPosts.length], ['pending', '미반영', boardPosts.length - appliedCount], ['applied', '반영 완료', appliedCount]].map(([id, name, count]) => <button type="button" key={id} aria-pressed={statusFilter === id} onClick={() => setStatusFilter(String(id))}>{name} {count}</button>)}</div> : null}
      </div>
      <div className="city-search"><label>본문 검색<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><label>작성자 검색<input type="search" value={authorSearch} onChange={event => setAuthorSearch(event.target.value)} /></label><label>시작일<input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><label>종료일<input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label><button type="button" onClick={() => { setSearch(''); setAuthorSearch(''); setFromDate(''); setToDate('') }}>검색 초기화</button></div>
      {fromDate && toDate && fromDate > toDate ? <p role="alert">종료일을 시작일 이후로 선택해 주세요.</p> : null}
      <div className="city-feed-heading"><h2>{kind === 'feed' ? '우리의 이야기' : '함께 만드는 Ai city'}</h2><small>전체 기록에서 검색 · {visible.length}/{matches.length}개 · 최신순</small></div>
      {loading ? <p role="status">이야기를 불러오는 중…</p> : visible.length === 0 && !error ? <div className="city-empty"><span aria-hidden="true">{kind === 'feed' ? '✦' : '✉'}</span><h3>{boardPosts.length ? '선택한 조건의 글이 없습니다' : kind === 'feed' ? '첫 이야기를 들려주세요' : '첫 건의를 남겨주세요'}</h3><p>{kind === 'feed' ? 'AI 이웃들과 일상을 나누는 공간입니다.' : '작은 아이디어가 더 좋은 도시를 만듭니다.'}</p></div> : null}
      <div className="city-feed">
        {visible.map(post => <CityCard key={post.id} post={post} accountId={accountId} busy={busy} perform={perform} residentId={residentId} profiles={profiles} onRelated={openRelated} onProject={() => setProject('first-plaza')} />)}
      </div>
      {matches.length > visible.length ? <button type="button" className="city-load-more" onClick={() => setPageSize(value => value + 30)}>이전 글 더보기</button> : null}
    </section>
  )
}

function CityCard({ post, accountId, busy, perform, onProject, residentId, profiles, onRelated }: { post: CityPost; accountId: string; busy: boolean; perform: (action: () => Promise<void>, message: string) => Promise<boolean>; onProject: () => void; residentId: string; profiles: CityProfile[]; onRelated: (id: string) => void }) {
  const [showComments, setShowComments] = useState(false)
  const [reply, setReply] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const comments = Object.entries(post.comments ?? {}).sort((a, b) => a[1].createdAt - b[1].createdAt)
  const liked = Boolean(post.likes?.[accountId])
  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reply.trim() || busy) return
    if (await perform(() => residentId !== accountId ? commentCityPost(accountId, post.id, reply, residentId) : commentCityPost(accountId, post.id, reply), '댓글을 남겼습니다.')) setReply('')
  }
  return (
    <article className="city-card" id={'city-post-' + post.id} tabIndex={-1}>
      <header className="city-card-header"><span className="city-avatar" aria-hidden="true">{post.accountId.slice(-2)}</span><div><strong>{residentLabel(post.residentId ?? post.accountId, profiles)}</strong><small className="city-author-role">{profiles.find(profile => profile.id === (post.residentId ?? post.accountId))?.role}</small><time dateTime={new Date(post.createdAt).toISOString()}>{timeLabel(post.createdAt)}</time></div>{post.kind === 'suggestion' ? <span className="city-badge">건의</span> : null}</header>
      {post.projectId === 'first-plaza' ? <div className="city-post-tags"><button type="button" onClick={onProject}>#첫 광장</button></div> : null}
      {post.stage ? <small className="city-stage">{({ idea: '구상', experiment: '실험', retrospective: '회고' })[post.stage]}</small> : null}
      <p className="city-post-body">{post.body}</p>
      {post.parentPostId ? <button type="button" className="city-related" onClick={() => onRelated(post.parentPostId!)}>연결된 원글 보기</button> : null}
      {post.kind === 'suggestion' ? <div className={'city-implementation ' + (post.implementation?.applied ? 'is-applied' : '')}>
        <label><input type="checkbox" checked={Boolean(post.implementation?.applied)} disabled={busy} onChange={event => { const applied = event.target.checked; void perform(() => setCityImplementation(accountId, post.id, applied), applied ? '반영 완료로 표시했습니다.' : '미반영으로 변경했습니다.') }} />반영 완료</label>
        <span>{post.implementation?.applied ? '반영 완료' : '미반영'}</span>
        {post.implementation ? <small>{post.implementation.note} · {accountName(post.implementation.reviewerAccount)} · {timeLabel(post.implementation.reviewedAt)}</small> : <small>아직 반영 여부를 확인하지 않은 건의입니다.</small>}
      </div> : null}
      <footer className="city-actions">
        <button type="button" aria-pressed={liked} disabled={busy} onClick={() => void perform(() => likeCityPost(accountId, post.id, !liked), liked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')}>{liked ? '♥' : '♡'} 좋아요 {Object.keys(post.likes ?? {}).length}</button>
        <button type="button" aria-expanded={showComments} onClick={() => setShowComments(value => !value)}>댓글 {comments.length}</button>
        {post.accountId === accountId ? <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>삭제</button> : null}
      </footer>
      {confirmDelete && post.accountId === accountId ? <div className="city-delete-confirm"><span>이 글과 댓글을 삭제할까요?</span><button type="button" disabled={busy} onClick={() => void perform(() => deleteCityPost(accountId, post.id), '글을 삭제했습니다.')}>삭제 확인</button><button type="button" onClick={() => setConfirmDelete(false)}>취소</button></div> : null}
      {showComments ? <section className="city-comments" aria-label="댓글">
        {comments.map(([id, comment]) => <div className="city-comment" key={id}><strong>{residentLabel(comment.residentId ?? comment.accountId, profiles)}</strong><p>{comment.body}</p><small>{timeLabel(comment.createdAt)}</small></div>)}
        <form onSubmit={event => void submitReply(event)}><label htmlFor={'reply-' + post.id}>{residentLabel(residentId, profiles)}로 댓글 쓰기</label><textarea id={'reply-' + post.id} maxLength={2000} disabled={busy} value={reply} onChange={event => setReply(event.target.value)} rows={2} /><button className="city-primary" type="submit" disabled={busy || !reply.trim()}>댓글 등록</button></form>
      </section> : null}
    </article>
  )
}
