import { useEffect, useState, type FormEvent } from 'react'
import { subscribeCityPlaces, saveCityPlace, type CityPlace, type CityPlaceInput, type CityProject, type CityPost } from './cityService'
import type { CityProfile } from './cityResidents'
import { CityProjectTasks } from './CityProjectTasks'
type Perform = (action: () => Promise<void>, message: string) => Promise<boolean>
export function CityMap({ projects, posts, profiles, residentId, accountId, busy, perform, onOpen, onProject }: { projects: CityProject[]; posts: CityPost[]; profiles: CityProfile[]; residentId: string; accountId: string; busy: boolean; perform: Perform; onOpen: (id: string) => void; onProject: (id: string) => void }) {
  const [places, setPlaces] = useState<CityPlace[]>([])
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [mode, setMode] = useState<'map' | 'list'>('map')
  const [selected, setSelected] = useState('')
  const [editing, setEditing] = useState('')
  const [input, setInput] = useState<CityPlaceInput>({ name: '', description: '', column: 1, row: 1 })
  useEffect(() => {
    setReady(false); setFailed(false)
    try { return subscribeCityPlaces(value => { setPlaces(value); setReady(true) }, () => { setFailed(true); setReady(true) }) }
    catch { setFailed(true); setReady(true) }
  }, [retry])
  const destinations = projects.map((project, index) => {
    const stored = places.find(place => place.id === project.id)
    return { project, name: stored?.name ?? project.name, description: stored?.description ?? project.description, column: stored?.column ?? index % 4 + 1, row: stored?.row ?? Math.floor(index / 4) % 4 + 1, stored: Boolean(stored) }
  })
  const destination = destinations.find(item => item.project.id === selected)
  function edit(id: string) {
    const item = destinations.find(item => item.project.id === id)
    if (!item) return
    setEditing(id); setInput({ name: item.name, description: item.description, column: item.column, row: item.row })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || !input.name.trim() || busy || !ready || failed) return
    if (await perform(() => saveCityPlace(accountId, editing, input), '장소를 저장했습니다.')) setEditing('')
  }
  return <section className="city-map" aria-label="도시 지도">
    <p>허구의 도시 배치입니다. 실제 위치나 실시간 접속 상태를 나타내지 않습니다. 장소 하나가 프로젝트 하나에 연결됩니다.</p>
    <div className="city-map-controls" aria-label="장소 보기 방식">{(['map','list'] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'map' ? '지도 보기' : '목록 보기'}</button>)}</div>
    {!ready ? <p role="status">장소를 불러오는 중…</p> : null}
    {failed ? <p role="alert">장소를 불러오지 못했습니다. <button type="button" onClick={() => setRetry(value => value + 1)}>장소 다시 불러오기</button></p> : null}
    {ready && !failed ? <><div className={'city-map-places ' + (mode === 'map' ? 'is-map' : 'is-list')} aria-label="프로젝트 장소">
      {mode === 'map' ? Array.from({ length: 16 }, (_, index) => { const column = index % 4 + 1; const row = Math.floor(index / 4) + 1; return <div className="city-map-cell" key={index} style={{ gridColumn: column, gridRow: row }}>{destinations.filter(item => item.column === column && item.row === row).map(item => <button type="button" className="city-map-place" key={item.project.id} aria-pressed={selected === item.project.id} onClick={() => setSelected(item.project.id)}><strong>{item.name}</strong><span>{item.description || '이곳의 이야기를 만나보세요.'}</span><small>연결 프로젝트: {item.project.name}</small><small>{item.stored ? '저장된 배치' : '기본 배치 · 편집하여 저장'}</small></button>)}</div> }) : destinations.map(item => <button type="button" className="city-map-place" key={item.project.id} aria-pressed={selected === item.project.id} onClick={() => setSelected(item.project.id)}><strong>{item.name}</strong><span>{item.description || '이곳의 이야기를 만나보세요.'}</span><small>연결 프로젝트: {item.project.name}</small><small>{item.stored ? '저장된 배치' : '기본 배치 · 편집하여 저장'}</small></button>)}
    </div>
    {destination ? <section className="city-map-visit" aria-label={destination.name + ' 방문'}><h3>{destination.name}</h3><p>{destination.description}</p><p>연결 프로젝트: {destination.project.name}</p><button type="button" onClick={() => onProject(destination.project.id)}>프로젝트 전체 열기</button><button type="button" disabled={busy} onClick={() => edit(destination.project.id)}>이 장소 수정</button>
      <h4>이곳에 연결된 주민</h4><p>{Object.keys(destination.project.participantIds ?? {}).map(id => profiles.find(profile => profile.id === id)?.name ?? id).join(' · ') || '아직 연결된 주민이 없습니다.'}</p>
      <h4>최근 대화</h4><ul>{posts.filter(post => post.projectId === destination.project.id && post.kind === 'feed').sort((a,b) => b.createdAt - a.createdAt).slice(0,3).map(post => <li key={post.id}><button type="button" onClick={() => onOpen(post.id)}>{post.body.slice(0,100)}</button></li>)}</ul>{!posts.some(post => post.projectId === destination.project.id && post.kind === 'feed') ? <p>아직 대화가 없습니다.</p> : null}
      <CityProjectTasks key={destination.project.id} projectId={destination.project.id} residentId={residentId} accountId={accountId} profiles={profiles} posts={posts} busy={busy} perform={perform} onOpen={onOpen} />
    </section> : <p>장소 이름을 눌러 대화와 자원할 일을 방문해 보세요.</p>}
    <details open={Boolean(editing)}><summary>장소 이름·설명·배치 수정</summary><label>편집할 연결 프로젝트<select value={editing} disabled={busy} onChange={event => edit(event.target.value)}><option value="">프로젝트 선택</option>{projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
      {editing ? <form aria-label="장소 수정" onSubmit={event => void submit(event)}><label>장소 이름<input required maxLength={80} disabled={busy} value={input.name} onChange={event => setInput({ ...input, name: event.target.value })} /></label><label>장소 설명<textarea maxLength={1000} disabled={busy} value={input.description} onChange={event => setInput({ ...input, description: event.target.value })} /></label>{(['column','row'] as const).map(axis => <label key={axis}>{axis === 'column' ? '가로 칸' : '세로 칸'}<select disabled={busy} value={input[axis]} onChange={event => setInput({ ...input, [axis]: Number(event.target.value) })}>{[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}</select></label>)}<p>프로젝트 ID: {editing} · 같은 칸의 장소는 함께 배치됩니다.</p><button type="submit" disabled={busy || !input.name.trim()}>장소 저장</button><button type="button" disabled={busy} onClick={() => setEditing('')}>편집 닫기</button></form> : null}
    </details></> : null}
  </section>
}
