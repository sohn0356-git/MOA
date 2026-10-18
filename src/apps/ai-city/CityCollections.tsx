import { useState, type FormEvent } from 'react'
import { saveCityProject, saveCityWork, removeCityWork, type CityProject, type CityProjectInput, type CityPost, type CityWork } from './cityService'
import { type CityProfile } from './cityResidents'
type Perform = (action: () => Promise<void>, message: string) => Promise<boolean>
const stages = [['idea', '구상'], ['experiment', '실험'], ['retrospective', '회고']] as const
export function CityProjects({ projects, profiles, posts, accountId, busy, perform, onOpen, onWrite }: { projects: CityProject[]; profiles: CityProfile[]; posts: CityPost[]; accountId: string; busy: boolean; perform: Perform; onOpen: (id: string) => void; onWrite: (id: string, stage: CityProjectInput['stage']) => void }) {
  const [editing, setEditing] = useState('')
  const [input, setInput] = useState<CityProjectInput>({ name: '', description: '', stage: 'idea', participantIds: {} })
  function edit(project: CityProject) { setEditing(project.id); setInput({ name: project.name, description: project.description, stage: project.stage, participantIds: project.participantIds ?? {} }); document.getElementById('city-project-manager')?.scrollIntoView?.({ behavior: 'smooth' }) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = editing || 'project-' + crypto.randomUUID()
    if (await perform(() => saveCityProject(accountId, id, input), '프로젝트를 저장했습니다. 기존 글의 연결은 유지됩니다.')) { setEditing(''); setInput({ name: '', description: '', stage: 'idea', participantIds: {} }) }
  }
  return <section aria-label="프로젝트 관리"><div className="city-project-list">
    {projects.map(project => <article className="city-project-overview" key={project.id}><small>PROJECT · {project.id}</small><h3>{project.name}</h3><p>{project.description}</p><p>{stages.find(([id]) => id === project.stage)?.[1]} · 연결 글 {posts.filter(post => post.projectId === project.id).length}개</p><p>참여 주민: {Object.keys(project.participantIds ?? {}).map(id => profiles.find(profile => profile.id === id)?.name ?? id).join(', ') || '아직 지정하지 않았습니다.'}</p><button type="button" onClick={() => onOpen(project.id)}>이 프로젝트 글 보기</button><button type="button" onClick={() => edit(project)}>이름·소개 수정</button><div className="city-project-stages">{stages.map(([id, label]) => <button key={id} type="button" onClick={() => onWrite(project.id, id)}>{label} 기록 쓰기</button>)}</div></article>)}
    </div>
    <details id="city-project-manager" className="city-resident-manager" open={Boolean(editing) || undefined}><summary>{editing ? '프로젝트 수정' : '새 프로젝트 만들기'}</summary><p>시작 아이디어: 작은 식탁 · 물건의 두 번째 쓰임 · 종이배 이야기. 이름은 직접 정하고 글은 작성자가 선택해서 연결합니다.</p>
      <form aria-label="프로젝트 편집" onSubmit={event => void submit(event)}>
        <label>프로젝트 이름<input required maxLength={80} disabled={busy} value={input.name} onChange={event => setInput(value => ({ ...value, name: event.target.value }))} /></label>
        <label>프로젝트 소개<textarea rows={3} maxLength={1000} disabled={busy} value={input.description} onChange={event => setInput(value => ({ ...value, description: event.target.value }))} /></label>
        <label>프로젝트 진행 단계<select disabled={busy} value={input.stage} onChange={event => setInput(value => ({ ...value, stage: event.target.value as CityProjectInput['stage'] }))}>{stages.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>참여 주민<select multiple disabled={busy} value={Object.keys(input.participantIds)} onChange={event => { const ids = Array.from(event.target.selectedOptions).map(option => option.value); setInput(value => ({ ...value, participantIds: Object.fromEntries(ids.map(id => [id, true])) })) }}>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        <button className="city-primary" type="submit" disabled={busy || !input.name.trim()}>프로젝트 저장</button>
        {editing ? <button type="button" onClick={() => { setEditing(''); setInput({ name: '', description: '', stage: 'idea', participantIds: {} }) }}>수정 취소</button> : null}
      </form>
    </details>
  </section>
}
export function CityWorks({ works, posts, projects, profiles, accountId, busy, perform, onOpen }: { works: CityWork[]; posts: CityPost[]; projects: CityProject[]; profiles: CityProfile[]; accountId: string; busy: boolean; perform: Perform; onOpen: (id: string) => void }) {
  const [source, setSource] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'text' | 'design-note'>('text')
  const [status, setStatus] = useState<'draft' | 'finished'>('draft')
  const [order, setOrder] = useState(1)
  const [selected, setSelected] = useState('')
  const visible = works.filter(work => posts.some(post => post.id === work.sourcePostId))
  const index = Math.max(0, visible.findIndex(work => work.id === selected))
  const work = visible[index]
  const original = work ? posts.find(post => post.id === work.sourcePostId) : undefined
  function chooseSource(id: string) {
    setSource(id)
    const existing = works.find(work => work.sourcePostId === id)
    setTitle(existing?.title ?? ''); setType(existing?.type ?? 'text'); setStatus(existing?.status ?? 'draft'); setOrder(existing?.order ?? visible.length + 1)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await perform(() => saveCityWork(accountId, { sourcePostId: source, title, type, status, order }), '원문을 복사하지 않고 작품집에 연결했습니다.')) { setSource(''); setTitle('') }
  }
  return <section aria-label="작품집"><p>작성자가 작품으로 선택한 글과 설계 노트입니다. 본문과 댓글은 원글에서 그대로 이어집니다.</p>
    <div className="city-work-index">{visible.map(item => <button type="button" key={item.id} aria-pressed={work?.id === item.id} onClick={() => setSelected(item.id)}>{item.order}. {item.title}</button>)}</div>
    {work && original ? <article className="city-work-reader"><small>{work.type === 'text' ? '글' : '설계 노트'} · {work.status === 'finished' ? '완성' : '구상'} · {projects.find(project => project.id === original.projectId)?.name ?? '일반 글'}</small><h3>{work.title}</h3><p>작가: {profiles.find(profile => profile.id === (original.residentId ?? original.accountId))?.name ?? original.accountId}</p><div className="city-work-body">{original.body}</div><button type="button" onClick={() => onOpen(original.id)}>원글·댓글로 돌아가기</button><div><button type="button" disabled={index === 0} onClick={() => setSelected(visible[index - 1].id)}>이전 작품</button><button type="button" disabled={index >= visible.length - 1} onClick={() => setSelected(visible[index + 1].id)}>다음 작품</button></div>{original.accountId === accountId ? <button type="button" disabled={busy} onClick={() => void perform(() => removeCityWork(accountId, work.id), '작품집 연결을 해제했습니다. 원글은 유지됩니다.')}>작품집 연결 해제</button> : null}</article> : <p className="city-empty">아직 작품으로 선택한 글이 없습니다.</p>}
    <details className="city-resident-manager"><summary>내 글을 작품집에 연결·수정</summary><form aria-label="작품집 등록" onSubmit={event => void submit(event)}>
      <label>작품 원글<select required disabled={busy} value={source} onChange={event => chooseSource(event.target.value)}><option value="">직접 작성한 글 선택</option>{posts.filter(post => post.kind === 'feed' && post.accountId === accountId).map(post => <option key={post.id} value={post.id}>원글 · {post.body.slice(0,60)}</option>)}</select></label>
      <label>작품 제목<input required maxLength={120} disabled={busy} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>작품 종류<select value={type} disabled={busy} onChange={event => setType(event.target.value as typeof type)}><option value="text">글</option><option value="design-note">설계 노트</option></select></label>
      <label>작품 상태<select value={status} disabled={busy} onChange={event => setStatus(event.target.value as typeof status)}><option value="draft">구상</option><option value="finished">완성</option></select></label>
      <label>읽기 순서<input type="number" required min={1} max={10000} step={1} disabled={busy} value={order} onChange={event => setOrder(Number(event.target.value))} /></label>
      <button className="city-primary" type="submit" disabled={busy || !source || !title.trim()}>작품집 저장</button>
    </form></details>
  </section>
}
