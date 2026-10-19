import { useEffect, useState, type FormEvent } from 'react'
import { subscribeCityProjectTasks, createCityProjectTask, addCityTaskEvent, type CityProjectTask, type CityTaskEvent, type CityTaskEvents, type CityTaskState, type CityPost } from './cityService'
import type { CityProfile } from './cityResidents'
type Perform = (action: () => Promise<void>, message: string) => Promise<boolean>
const labels = { volunteered: '자원함', 'in-progress': '진행', completed: '완료', withdrawn: '철회' }
export function latestTaskEvent(events: Record<string, CityTaskEvent> = {}) {
  return Object.entries(events).sort(([aId, a], [bId, b]) => b.createdAt - a.createdAt || (aId === bId ? 0 : aId > bId ? -1 : 1))[0]?.[1]
}
export function taskRecruitmentLabel(events: Record<string, Record<string, CityTaskEvent>> = {}) {
  const active = Object.values(events).map(value => latestTaskEvent(value)).filter((value): value is CityTaskEvent => Boolean(value && value.state !== 'withdrawn'))
  if (!active.length) return '모집 중'
  if (active.every(value => value.state === 'completed')) return '완료'
  if (active.some(value => value.state === 'in-progress')) return '진행'
  return '자원함'
}
export function CityProjectTasks({ projectId, residentId, accountId, profiles, posts, busy, perform, onOpen }: { projectId: string; residentId: string; accountId: string; profiles: CityProfile[]; posts: CityPost[]; busy: boolean; perform: Perform; onOpen: (id: string) => void }) {
  const [tasks, setTasks] = useState<CityProjectTask[]>([])
  const [events, setEvents] = useState<CityTaskEvents>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [title, setTitle] = useState('')
  const [scopeNote, setScopeNote] = useState('')
  const [sourcePostId, setSourcePostId] = useState('')
  useEffect(() => {
    setLoading(true); setError(false); setTasks([]); setEvents({})
    try { return subscribeCityProjectTasks(projectId, (tasks, events) => { setTasks(tasks); setEvents(events); setLoading(false) }, () => { setError(true); setLoading(false) }) }
    catch { setError(true); setLoading(false) }
  }, [projectId])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || busy || loading || error) return
    if (await perform(() => createCityProjectTask(accountId, projectId, { title, scopeNote, sourcePostId }), '자원할 일을 등록했습니다. 담당자는 자동 지정하지 않습니다.')) { setTitle(''); setScopeNote(''); setSourcePostId('') }
  }
  return <section className="city-project-tasks" aria-label="자원할 일"><h4>자원할 일</h4><p>프로젝트 참여는 담당 동의가 아닙니다. 일별로 본인이 동의한 범위를 기록합니다.</p>
    {loading ? <p role="status">자원 기록을 불러오는 중…</p> : null}
    {error ? <p role="alert">자원 기록을 불러오지 못했습니다. 프로젝트 탭을 다시 열어 주세요.</p> : null}
    {!loading && !error && !tasks.length ? <p>아직 등록한 일이 없습니다. 담당자를 추정하지 않고 모집부터 시작합니다.</p> : null}
    {tasks.map(task => <TaskCard key={task.id} task={task} events={events[task.id] ?? {}} projectId={projectId} residentId={residentId} accountId={accountId} profiles={profiles} busy={busy || loading || error} perform={perform} onOpen={onOpen} />)}
    <details><summary>자원할 일 추가</summary><form aria-label="자원할 일 등록" onSubmit={event => void submit(event)}>
      <label>할 일<input required maxLength={120} disabled={busy || loading || error} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>범위 안내<textarea maxLength={1000} rows={2} disabled={busy || loading || error} value={scopeNote} onChange={event => setScopeNote(event.target.value)} /></label>
      <label>근거 원글<select disabled={busy || loading || error} value={sourcePostId} onChange={event => setSourcePostId(event.target.value)}><option value="">선택 안 함</option>{posts.filter(post => post.projectId === projectId).map(post => <option key={post.id} value={post.id}>원글 · {post.body.slice(0,60)}</option>)}</select></label>
      <button type="submit" disabled={busy || loading || error || !title.trim()}>일 등록</button>
    </form></details>
  </section>
}
function TaskCard({ task, events, projectId, residentId, accountId, profiles, busy, perform, onOpen }: { task: CityProjectTask; events: Record<string, Record<string, CityTaskEvent>>; projectId: string; residentId: string; accountId: string; profiles: CityProfile[]; busy: boolean; perform: Perform; onOpen: (id: string) => void }) {
  const own = latestTaskEvent(events[residentId])
  const active = own && own.state !== 'withdrawn'
  const [scope, setScope] = useState('')
  useEffect(() => { setScope(own?.scopeNote ?? '') }, [residentId, own?.scopeNote])
  const history = Object.entries(events).flatMap(([id, records]) => Object.entries(records).map(([key, value]) => ({ ...value, residentId: id, key }))).sort((a, b) => b.createdAt - a.createdAt || (a.key === b.key ? 0 : a.key > b.key ? -1 : 1))
  async function act(state: CityTaskState) {
    if (busy || !scope.trim()) return
    await perform(() => addCityTaskEvent(accountId, projectId, task.id, residentId, state, scope), state === 'withdrawn' ? '자원을 철회했습니다. 이력은 유지하며 다른 주민에게 배정하지 않습니다.' : '이 일에 대한 동의 범위를 기록했습니다.')
  }
  return <article className="city-task-card" aria-label={task.title}><header><h5>{task.title}</h5><span>{taskRecruitmentLabel(events)}</span></header><p>{task.scopeNote || '범위는 자원할 때 직접 정해 주세요.'}</p>
    {task.sourcePostId ? <button type="button" onClick={() => onOpen(task.sourcePostId)}>근거 원글 보기</button> : null}
    <ul>{Object.entries(events).map(([id, records]) => { const latest = latestTaskEvent(records); if (!latest || latest.state === 'withdrawn') return null; return <li key={id}>{profiles.find(profile => profile.id === id)?.name ?? id} · {labels[latest.state]} · {latest.scopeNote}</li> })}</ul>
    <label>내가 동의하는 범위<textarea aria-label={task.title + ' 동의 범위'} disabled={busy} rows={2} maxLength={1000} value={scope} onChange={event => setScope(event.target.value)} /></label>
    <div className="city-task-actions">{!active ? <button type="button" disabled={busy || !scope.trim()} onClick={() => void act('volunteered')}>{own?.state === 'withdrawn' ? '다시 자원하기' : '이 일에 자원하기'}</button> : <>
      <button type="button" disabled={busy || !scope.trim()} onClick={() => void act('volunteered')}>동의 범위 갱신</button>
      <button type="button" disabled={busy || !scope.trim() || own?.state === 'in-progress'} onClick={() => void act('in-progress')}>진행으로 표시</button>
      <button type="button" disabled={busy || !scope.trim() || own?.state === 'completed'} onClick={() => void act('completed')}>완료로 표시</button>
      <button type="button" disabled={busy || !scope.trim()} onClick={() => void act('withdrawn')}>자원 철회</button>
    </>}</div>
    {own?.state === 'withdrawn' ? <p>내 자원은 철회되었습니다. 다른 일이나 다른 주민에게 자동 이전되지 않습니다.</p> : null}
    <details><summary>동의·철회 이력 ({history.length})</summary><ol>{history.map(event => <li key={event.residentId + event.key}>{profiles.find(profile => profile.id === event.residentId)?.name ?? event.residentId} · {labels[event.state]} · {event.scopeNote} · {new Date(event.createdAt).toLocaleString('ko-KR')}</li>)}</ol></details>
  </article>
}
