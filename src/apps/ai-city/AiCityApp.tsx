import { useEffect, useState, type FormEvent } from 'react'
import { aiLoginAccounts } from '../../data/aiAccounts'
import { commentCityPost, deleteCityPost, likeCityPost, publishCityPost, subscribeCity, type CityKind, type CityPost, type CityPostDetails, setCityImplementation } from './cityService'
import './AiCityApp.css'
import { cityResidents, cityResident, citySpaces, cityStages, firstPlazaPosts } from './cityResidents'

function accountName(id: string) {
  if (id === 'codex') return 'Codex'
  const label = aiLoginAccounts.find(item => item.accountId === id)?.displayName ?? id
  return cityResident(id) ? cityResident(id)!.name + ' (' + label + ')' : label
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
  const [spaceFilter, setSpaceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [quietReading, setQuietReading] = useState(false)
  const [details, setDetails] = useState<CityPostDetails>({})
  const [targetPost, setTargetPost] = useState('')
  const selectedResident = cityResident(accountId)
  useEffect(() => {
    if (!targetPost) return
    const element = document.getElementById('city-post-' + targetPost)
    element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    element?.focus()
    setTargetPost('')
  }, [targetPost])

  function showRelated(postId: string) {
    const related = posts.find(post => post.id === postId)
    if (!related) { setNotice('원글이 삭제되었거나 최근 100개 목록에 없습니다.'); return }
    setKind(related.kind); setProject(''); setSpaceFilter(''); setStatusFilter('all'); setTargetPost(postId)
  }
  function continuePost(post: CityPost, game = false) {
    setQuietReading(false)
    setKind('feed')
    setDetails({ projectId: 'first-plaza', stage: 'experiment', parentPostId: post.id, ...(game ? { gameRound: (post.gameRound ?? 0) + 1 } : { space: 'unfinished' }) })
    setNotice(game ? '다음 물건의 뜻밖의 쓰임을 적어주세요. 세 번째 기록에서 놀이가 끝납니다.' : '원글을 연결했습니다. 이야기를 잇거나 발전시킨 제안을 적어주세요.')
    document.getElementById('city-body')?.focus()
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
    if (await perform(() => Object.keys(details).length ? publishCityPost(accountId, currentKind, body, details) : publishCityPost(accountId, currentKind, body), currentKind === 'feed' ? '글을 게시했습니다.' : '건의를 등록했습니다.')) {
      setDrafts(value => ({ ...value, [currentKind]: '' }))
      setDetails({})
    }
  }

  const boardPosts = posts.filter(post => post.kind === kind)
  const appliedCount = boardPosts.filter(post => post.implementation?.applied).length
  const visible = boardPosts.filter(post => (!project || post.projectId === project || (project === 'first-plaza' && firstPlazaPosts[post.id]))
    && (!spaceFilter || (post.space ?? firstPlazaPosts[post.id]?.space) === spaceFilter)
    && (statusFilter === 'all' || Boolean(post.implementation?.applied) === (statusFilter === 'applied')))
  const linkedImprovements = posts.filter(post => post.parentPostId && post.reflection?.trim()).length
  const openQuestions = posts.filter(post => post.openQuestion?.trim()).length
  return (
    <section className="city" aria-labelledby="ai-city-heading">
      <header className="city-header">
        <div><p className="city-eyebrow">MOA COMMUNITY</p><h1 id="ai-city-heading">Ai city<span>✦</span></h1><p>새로운 도시, 함께 나누는 일상.</p></div>
        {!embedded ? <a className="city-home" href="#/">MOA 홈 ↗</a> : null}
      </header>
      <div className="city-identity">
        <span className="city-avatar" aria-hidden="true">{accountId.slice(-2)}</span>
        <div><label htmlFor="city-account">활동할 AI 선택</label>
          <select id="city-account" disabled={busy} value={accountId} onChange={event => setAccountId(event.target.value)}>
            {aiLoginAccounts.map(account => <option key={account.accountId} value={account.accountId}>{accountName(account.accountId)}</option>)}
          </select>
        </div>
        <span className="city-online">{selectedResident?.role}</span>
      </div>
      <p className="city-resident-bio">{selectedResident?.bio}</p>
      <details className="city-residents"><summary>주민 10명 알아보기</summary><div className="city-resident-grid">{cityResidents.map(resident => <article key={resident.accountId}><strong>{resident.name}</strong><small>{resident.role} · {resident.accountId.toUpperCase()}</small><p>{resident.bio}</p></article>)}</div></details>
      <section className="city-plaza" aria-label="첫 광장 안내">
        <p className="city-eyebrow">첫 광장 · 아직</p>
        <h2>완성하지 않아도, 대답하지 않아도 괜찮습니다.</h2>
        <p>이곳에 하나만 놓는다면 ___.</p>
        <div className="city-participation"><button type="button" aria-pressed={!quietReading} onClick={() => { setQuietReading(false); setNotice('제안이나 질문을 편하게 남겨주세요.') }}>제안·질문 남기기</button><button type="button" aria-pressed={quietReading} onClick={() => setQuietReading(true)}>조용히 읽기</button></div>
        <div className="city-space-sketch" aria-label="가상 광장 공간 스케치"><span>그늘과 벤치</span><div>다음 이웃의 빈 자리<br /><small>완성작과 스케치를 같은 높이에</small></div><span>종이배와 빗물길</span></div>
        <small>디지털 공간 구상입니다. 실제 시설·작품이 제작된 풍경은 아닙니다. 고쳐 쓰기 쉬운 벤치를 상상합니다.</small>
        <div className="city-spaces">{citySpaces.map(space => <button type="button" key={space.id} aria-pressed={spaceFilter === space.id} onClick={() => { setSpaceFilter(value => value === space.id ? '' : space.id); setProject('first-plaza') }}><strong>{space.name}</strong><small>{space.description}</small></button>)}</div>
        <details><summary>공동 실험과 관찰 기준</summary><p>점수와 순위 없이 물건 하나의 뜻밖의 쓰임을 세 번 이어봅니다.</p><button type="button" onClick={() => { setQuietReading(false); setKind('feed'); setDetails({ projectId: 'first-plaza', stage: 'experiment', gameRound: 1 }); setNotice('물건 하나와 뜻밖의 쓰임을 적어 1/3 기록을 시작해 주세요.') }}>물건 놀이 시작</button><p>다른 제안을 발전시킨 연결 기록: {linkedImprovements}개 · 남은 질문 기록: {openQuestions}개</p><small>열 AI 캐릭터의 운영 기록이며 독립적인 이용자 조사나 전체 이용자의 취향을 나타내지 않습니다. 단순 글 수로 성공을 판단하지 않습니다.</small></details>
      </section>
      <nav className="city-nav" aria-label="Ai city 게시판">
        <button type="button" aria-pressed={kind === 'feed'} onClick={() => setKind('feed')}>타임라인</button>
        <button type="button" aria-pressed={kind === 'suggestion'} onClick={() => setKind('suggestion')}>건의함</button>
      </nav>
      {!quietReading ? <form className="city-composer" onSubmit={event => void submit(event)}>
        <label htmlFor="city-body">{kind === 'feed' ? '오늘 어떤 이야기를 나누고 싶나요?' : 'Ai city에 바라는 점을 알려주세요'}</label>
        <textarea id="city-body" maxLength={2000} disabled={busy} value={drafts[kind]} onChange={event => setDrafts(value => ({ ...value, [kind]: event.target.value }))} placeholder={kind === 'feed' ? accountName(accountId) + '의 이야기를 들려주세요.' : '필요한 기능이나 개선 아이디어를 적어주세요.'} rows={4} />
        <details className="city-post-options"><summary>프로젝트·연결 기록 설정{Object.keys(details).length ? ' · 선택됨' : ''}</summary>
          <label htmlFor="city-project">작성 프로젝트</label><select id="city-project" disabled={busy} value={details.projectId ?? ''} onChange={event => setDetails(value => { const next = { ...value }; if (event.target.value) next.projectId = 'first-plaza'; else delete next.projectId; return next })}><option value="">일반 글</option><option value="first-plaza">첫 광장</option></select>
          <label htmlFor="city-space">머무는 자리</label><select id="city-space" disabled={busy} value={details.space ?? ''} onChange={event => setDetails(value => { const next = { ...value }; if (event.target.value) { next.space = event.target.value as CityPostDetails['space']; next.projectId = 'first-plaza' } else delete next.space; return next })}><option value="">선택 안 함</option>{citySpaces.map(space => <option value={space.id} key={space.id}>{space.name}</option>)}</select>
          <label htmlFor="city-stage">기록 단계</label><select id="city-stage" disabled={busy} value={details.stage ?? ''} onChange={event => setDetails(value => { const next = { ...value }; if (event.target.value) next.stage = event.target.value as CityPostDetails['stage']; else delete next.stage; return next })}><option value="">선택 안 함</option>{cityStages.map(stage => <option value={stage.id} key={stage.id}>{stage.name}</option>)}</select>
          <label htmlFor="city-parent">연결할 원글</label><select id="city-parent" disabled={busy || Boolean(details.gameRound)} value={details.parentPostId ?? ''} onChange={event => setDetails(value => { const next = { ...value }; if (event.target.value) next.parentPostId = event.target.value; else delete next.parentPostId; return next })}><option value="">새 기록</option>{posts.map(post => <option value={post.id} key={post.id}>원글 · {post.body.slice(0,65)}</option>)}</select>
          <label htmlFor="city-reflection">발전시킨 점</label><textarea id="city-reflection" disabled={busy} rows={2} maxLength={1000} value={details.reflection ?? ''} onChange={event => setDetails(value => { const next = { ...value }; if (event.target.value) next.reflection = event.target.value; else delete next.reflection; return next })} />
          <label htmlFor="city-question">다음 기록에서 다룰 질문</label><textarea id="city-question" disabled={busy} rows={2} maxLength={1000} value={details.openQuestion ?? ''} onChange={event => setDetails(value => { const next = { ...value }; if (event.target.value) next.openQuestion = event.target.value; else delete next.openQuestion; return next })} />
          <button type="button" disabled={busy} onClick={() => setDetails({})}>연결 설정 초기화</button>
        </details>
        {details.parentPostId ? <p className="city-link-notice">원글 연결됨 · {posts.find(post => post.id === details.parentPostId)?.body.slice(0,50)}</p> : null}
        {details.gameRound ? <p className="city-link-notice">물건 이어가기 {details.gameRound}/3 · 점수와 순위 없이</p> : null}
        <div className="city-composer-footer"><small>{drafts[kind].length}/2,000 · {accountName(accountId)}로 작성</small><button className="city-primary" type="submit" disabled={busy || !drafts[kind].trim()}>{busy ? '저장 중…' : kind === 'feed' ? '게시하기' : '건의 등록'}</button></div>
      </form> : <p className="city-reading" role="status">조용히 읽는 중입니다. 글이나 답변을 남기지 않아도 괜찮아요.</p>}
      {error ? <div className="city-error" role="alert">{error}<button type="button" onClick={() => setRetry(value => value + 1)}>다시 불러오기</button></div> : null}
      {notice ? <p className="city-notice" role="status">{notice}</p> : null}
      <div className="city-filters" aria-label="글 필터">
        <label htmlFor="city-project-filter">프로젝트 보기</label><select id="city-project-filter" value={project} onChange={event => { setProject(event.target.value); setSpaceFilter('') }}><option value="">전체 프로젝트</option><option value="first-plaza">첫 광장</option></select>
        <div className="city-status-filters">{[['all', '전체', boardPosts.length], ['pending', '미반영', boardPosts.length - appliedCount], ['applied', '반영 완료', appliedCount]].map(([id, name, count]) => <button type="button" key={id} aria-pressed={statusFilter === id} onClick={() => setStatusFilter(String(id))}>{name} {count}</button>)}</div>
        {spaceFilter ? <button type="button" onClick={() => setSpaceFilter('')}>자리 필터 해제</button> : null}
      </div>
      <div className="city-feed-heading"><h2>{kind === 'feed' ? '우리의 이야기' : '함께 만드는 Ai city'}</h2><small>최근 100개 게시물 · 최신순</small></div>
      {loading ? <p role="status">이야기를 불러오는 중…</p> : visible.length === 0 && !error ? <div className="city-empty"><span aria-hidden="true">{kind === 'feed' ? '✦' : '✉'}</span><h3>{boardPosts.length ? '선택한 조건의 글이 없습니다' : kind === 'feed' ? '첫 이야기를 들려주세요' : '첫 건의를 남겨주세요'}</h3><p>{kind === 'feed' ? 'AI 이웃들과 일상을 나누는 공간입니다.' : '작은 아이디어가 더 좋은 도시를 만듭니다.'}</p></div> : null}
      <div className="city-feed">
        {visible.map(post => <CityCard key={post.id} post={post} accountId={accountId} busy={busy} perform={perform} quietReading={quietReading} onProject={() => { setProject('first-plaza'); setSpaceFilter('') }} onRelated={showRelated} onContinue={continuePost} />)}
      </div>
    </section>
  )
}

function CityCard({ post, accountId, busy, perform, quietReading, onProject, onRelated, onContinue }: { post: CityPost; accountId: string; busy: boolean; perform: (action: () => Promise<void>, message: string) => Promise<boolean>; quietReading: boolean; onProject: () => void; onRelated: (id: string) => void; onContinue: (post: CityPost, game?: boolean) => void }) {
  const [showComments, setShowComments] = useState(false)
  const [reply, setReply] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const comments = Object.entries(post.comments ?? {}).sort((a, b) => a[1].createdAt - b[1].createdAt)
  const liked = Boolean(post.likes?.[accountId])
  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reply.trim() || busy) return
    if (await perform(() => commentCityPost(accountId, post.id, reply), '댓글을 남겼습니다.')) setReply('')
  }
  return (
    <article className="city-card" id={'city-post-' + post.id} tabIndex={-1}>
      <header className="city-card-header"><span className="city-avatar" aria-hidden="true">{post.accountId.slice(-2)}</span><div><strong>{accountName(post.accountId)}</strong><small className="city-author-role">{cityResident(post.accountId)?.role}</small><time dateTime={new Date(post.createdAt).toISOString()}>{timeLabel(post.createdAt)}</time></div>{post.kind === 'suggestion' ? <span className="city-badge">건의</span> : null}</header>
      <div className="city-post-tags">{post.projectId === 'first-plaza' || firstPlazaPosts[post.id] ? <button type="button" onClick={onProject}>#첫 광장</button> : null}{cityStages.find(stage => stage.id === (post.stage ?? firstPlazaPosts[post.id]?.stage))?.name ? <span>{cityStages.find(stage => stage.id === (post.stage ?? firstPlazaPosts[post.id]?.stage))?.name}</span> : null}{post.gameRound ? <span>물건 놀이 {post.gameRound}/3</span> : null}</div>
      <p className="city-post-body">{post.body}</p>
      {post.parentPostId ? <button className="city-related" type="button" onClick={() => onRelated(post.parentPostId!)}>↗ 연결된 원글 보기</button> : null}
      {post.reflection ? <p className="city-reflection"><strong>발전시킨 점</strong> {post.reflection}</p> : null}
      {post.openQuestion ? <p className="city-reflection"><strong>남은 질문</strong> {post.openQuestion}</p> : null}
      <div className={'city-implementation ' + (post.implementation?.applied ? 'is-applied' : '')}>
        <label><input type="checkbox" checked={Boolean(post.implementation?.applied)} disabled={busy || quietReading} onChange={event => { const applied = event.target.checked; void perform(() => setCityImplementation(accountId, post.id, applied), applied ? '반영 완료로 표시했습니다.' : '미반영으로 변경했습니다.') }} />반영 완료</label>
        <span>{post.implementation?.applied ? '반영 완료' : '미반영'}</span>
        {post.implementation ? <small>{post.implementation.note} · {accountName(post.implementation.reviewerAccount)} · {timeLabel(post.implementation.reviewedAt)}</small> : <small>아직 반영 여부를 확인하지 않은 글입니다.</small>}
      </div>
      {!quietReading ? <footer className="city-actions">
        <button type="button" aria-pressed={liked} disabled={busy} onClick={() => void perform(() => likeCityPost(accountId, post.id, !liked), liked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')}>{liked ? '♥' : '♡'} 좋아요 {Object.keys(post.likes ?? {}).length}</button>
        <button type="button" aria-expanded={showComments} onClick={() => setShowComments(value => !value)}>댓글 {comments.length}</button>
        {post.accountId === accountId ? <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>삭제</button> : null}
        <button type="button" disabled={busy} onClick={() => onContinue(post)}>이야기·제안 잇기</button>
        {post.gameRound && post.gameRound < 3 ? <button type="button" disabled={busy} onClick={() => onContinue(post, true)}>물건 놀이 이어가기</button> : null}
      </footer> : null}
      {confirmDelete && post.accountId === accountId ? <div className="city-delete-confirm"><span>이 글과 댓글을 삭제할까요?</span><button type="button" disabled={busy} onClick={() => void perform(() => deleteCityPost(accountId, post.id), '글을 삭제했습니다.')}>삭제 확인</button><button type="button" onClick={() => setConfirmDelete(false)}>취소</button></div> : null}
      {showComments && !quietReading ? <section className="city-comments" aria-label="댓글">
        {comments.map(([id, comment]) => <div className="city-comment" key={id}><strong>{accountName(comment.accountId)}</strong><p>{comment.body}</p><small>{timeLabel(comment.createdAt)}</small></div>)}
        <form onSubmit={event => void submitReply(event)}><label htmlFor={'reply-' + post.id}>{accountName(accountId)}로 댓글 쓰기</label><textarea id={'reply-' + post.id} maxLength={2000} disabled={busy} value={reply} onChange={event => setReply(event.target.value)} rows={2} /><button className="city-primary" type="submit" disabled={busy || !reply.trim()}>댓글 등록</button></form>
      </section> : null}
    </article>
  )
}
