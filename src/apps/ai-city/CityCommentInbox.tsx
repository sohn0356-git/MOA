import { useEffect, useState } from 'react'
import { subscribeCityInbox, setCityInboxState, type CityInboxState, type CityPost } from './cityService'
import type { CityProfile } from './cityResidents'
type Perform = (action: () => Promise<void>, message: string) => Promise<boolean>
export function CityCommentInbox({ residentId, profiles, posts, busy, perform, onOpen }: { residentId: string; profiles: CityProfile[]; posts: CityPost[]; busy: boolean; perform: Perform; onOpen: (postId: string, commentId: string) => void }) {
  const [state, setState] = useState<CityInboxState>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'pending' | 'continued'>('all')
  useEffect(() => {
    setState({}); setLoading(true); setError(false)
    try { return subscribeCityInbox(residentId, value => { setState(value); setLoading(false) }, () => { setError(true); setLoading(false) }) }
    catch { setError(true); setLoading(false) }
  }, [residentId])
  const received = posts.filter(post => (post.residentId ?? post.accountId) === residentId).flatMap(post =>
    Object.entries(post.comments ?? {}).filter(([, comment]) => (comment.residentId ?? comment.accountId) !== residentId).map(([id, comment]) => ({ post, id, comment, progress: state[post.id]?.[id] }))
  ).sort((a, b) => b.comment.createdAt - a.comment.createdAt)
  const visible = received.filter(item => filter === 'all' || (filter === 'unread' ? !item.progress?.readAt : (item.progress?.status ?? 'pending') === filter))
  async function open(item: typeof received[number]) {
    if (loading || error) return
    const saved = await perform(() => setCityInboxState(item.post.accountId, residentId, item.post.id, item.id, 'read'), '읽음으로 표시했습니다. 답변 상태는 그대로 유지됩니다.')
    if (saved) onOpen(item.post.id, item.id)
  }
  return <section className="city-inbox" aria-label="받은 댓글 목록"><p>내 글에 다른 주민이 남긴 댓글입니다. 읽음과 답변 상태를 따로 관리합니다.</p>
    <div className="city-status-filters">{([['all', '전체'], ['unread', '안 읽음'], ['pending', '답변 대기'], ['continued', '이어감']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label} {received.filter(item => id === 'all' || (id === 'unread' ? !item.progress?.readAt : (item.progress?.status ?? 'pending') === id)).length}</button>)}</div>
    {loading ? <p role="status">댓글 상태를 불러오는 중…</p> : null}
    {error ? <p className="city-error" role="alert">댓글 상태를 불러오지 못했습니다. 다른 탭으로 이동한 뒤 다시 열어 주세요.</p> : null}
    {!loading && !error && !visible.length ? <p className="city-empty">선택한 조건의 받은 댓글이 없습니다.</p> : null}
    {visible.map(item => <article className="city-inbox-card" key={item.post.id + ':' + item.id}>
      <h3>{item.post.body.split('\n')[0].slice(0,100)}</h3>
      <p><strong>{profiles.find(profile => profile.id === (item.comment.residentId ?? item.comment.accountId))?.name ?? item.comment.accountId}</strong> · <time dateTime={new Date(item.comment.createdAt).toISOString()}>{new Date(item.comment.createdAt).toLocaleString('ko-KR')}</time></p>
      <p className="city-inbox-preview">{item.comment.body}</p>
      <small>{item.progress?.readAt ? '읽음' : '안 읽음'} · {item.progress?.status === 'continued' ? '이어감' : '답변 대기'}</small>
      <div><button type="button" disabled={busy || loading || error} onClick={() => void open(item)}>원글 댓글 열기</button>
      <button type="button" disabled={busy || loading || error} aria-pressed={(item.progress?.status ?? 'pending') === 'pending'} onClick={() => void perform(() => setCityInboxState(item.post.accountId, residentId, item.post.id, item.id, 'pending'), '답변 대기로 표시했습니다.')}>답변 대기로 표시</button>
      <button type="button" disabled={busy || loading || error} aria-pressed={item.progress?.status === 'continued'} onClick={() => void perform(() => setCityInboxState(item.post.accountId, residentId, item.post.id, item.id, 'continued'), '이어감으로 표시했습니다.')}>이어감으로 표시</button></div>
    </article>)}
  </section>
}
