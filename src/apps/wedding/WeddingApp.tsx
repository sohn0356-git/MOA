import { useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, CheckCheck, ChevronRight, Heart, House, MapPin, NotebookPen, Plus, Trash2, Wallet, X } from 'lucide-react'
import { getFirebaseAuth } from '../../services/firebase'
import { KoreaMap } from './KoreaMap'
import { readWedding, type WeddingData, type Place, type Note } from './weddingStorage'
import './WeddingApp.css'

const tabs = [{ name: '홈', icon: House }, { name: '지도', icon: MapPin }, { name: '체크리스트', icon: CheckCheck }, { name: '예산', icon: Wallet }, { name: '노트', icon: NotebookPen }]
const icons = ['♥', '💒', '💍', '📷', '💐', '👗', '🍽️', '🏠', '✈️', '⭐']
const money = (value: number) => new Intl.NumberFormat('ko-KR').format(value) + '원'

export function WeddingApp() {
  const uid = getFirebaseAuth().currentUser?.uid || 'guest'
  return <WeddingPlanner key={uid} storageKey={'moa-wedding-v1:' + uid}/>
}

export function WeddingPlanner({ storageKey }: { storageKey: string }) {
  const [data, setData] = useState(() => readWedding(storageKey))
  const [tab, setTab] = useState(0)
  const [error, setError] = useState('')
  const [place, setPlace] = useState<Place | null>(null)
  const [settings, setSettings] = useState(false)
  const [note, setNote] = useState<Note | null>(null)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const total = data.expenses.reduce((sum, item) => sum + item.amount, 0)
  const done = data.tasks.filter(item => item.done).length
  const days = data.date ? Math.ceil((new Date(data.date + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000) : null
  function save(next: WeddingData) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setData(next); setError(''); return true }
    catch { setError('저장하지 못했습니다. 브라우저 저장 설정과 용량을 확인한 뒤 다시 시도해주세요.'); return false }
  }
  function openDialog() {
    previousFocus.current = document.activeElement as HTMLElement
    setDeleting(false)
    requestAnimationFrame(() => dialog.current?.showModal())
  }
  function closeDialog() {
    dialog.current?.close(); setPlace(null); setSettings(false); setNote(null); setDeleting(false)
    previousFocus.current?.focus()
  }
  function editPlace(value: Place) { setPlace(value); setSettings(false); setNote(null); openDialog() }
  function addPlace(lat: number, lng: number) { editPlace({ id: crypto.randomUUID(), lat, lng, title: '', body: '', color: '#9b5d52', icon: '♥' }) }
  function editSettings() { setSettings(true); setPlace(null); setNote(null); openDialog() }
  function editNote(value: Note) { setNote(value); setPlace(null); setSettings(false); openDialog() }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    let next = data
    if (place) {
      const lat = Number(form.get('lat')), lng = Number(form.get('lng')), title = String(form.get('title') || '').trim()
      if (!title || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -85 || lat > 85 || lng < -180 || lng > 180) return
      const updated = { ...place, lat, lng, title, body: String(form.get('body') || '').trim(), color: String(form.get('color')), icon: String(form.get('icon') || '♥').trim() || '♥' }
      next = { ...data, places: data.places.some(p => p.id === place.id) ? data.places.map(p => p.id === place.id ? updated : p) : [...data.places, updated] }
    } else if (settings) {
      next = { ...data, names: String(form.get('names') || '').trim(), date: String(form.get('date') || '') }
    } else if (note) {
      const title = String(form.get('title') || '').trim()
      if (!title) return
      const updated = { ...note, title, body: String(form.get('body') || '').trim() }
      next = { ...data, notes: data.notes.some(n => n.id === note.id) ? data.notes.map(n => n.id === note.id ? updated : n) : [...data.notes, updated] }
    }
    if (save(next)) closeDialog()
  }
  function removeCurrent() {
    const next = place ? { ...data, places: data.places.filter(p => p.id !== place.id) } : { ...data, notes: data.notes.filter(n => n.id !== note?.id) }
    if (save(next)) closeDialog()
  }
  const visiblePlaces = data.places.filter(p => (p.title + ' ' + p.body).toLowerCase().includes(search.toLowerCase()))
  return <section className="wedding-app" aria-label="결혼준비">
    <header className="w-header"><a href="#/apps" aria-label="MOA 앱으로 돌아가기"><ArrowLeft size={19}/></a><a className="w-wordmark" href="#/suggestions"><Heart size={20}/> our beginning<span>WEDDING PLANNER</span></a><button type="button" className="w-icon-button" aria-label="결혼 정보 설정" onClick={editSettings}><CalendarDays size={20}/></button></header>
    <div className="w-content">
      {error && <p className="w-error" role="alert">{error}</p>}
      {tab === 0 && <>
        <div className="w-eyebrow">OUR NEXT CHAPTER</div>
        <section className="w-hero"><div><h1>함께 그리는,<br/><em>우리의 시작.</em></h1><p>설레는 순간부터 작은 준비까지.<br/>우리다운 결혼을 하나씩 만들어가요.</p><button className="w-primary" onClick={editSettings}>{data.date ? '결혼 정보 수정' : '우리의 날짜 정하기'}<ArrowUpRight size={17}/></button></div><div className="w-art" aria-hidden="true"><div className="w-arch"><span className="w-art-star">✧</span><div className="w-rings"><i/><i/></div><span className="w-art-caption">the best is<br/><em>yet to come</em></span></div><span className="w-art-flower">✳</span></div></section>
        <section className="w-countdown"><div><span className="w-eyebrow">THE DAY WE SAY YES</span><h2>{data.names || '우리의 결혼식'}</h2><button onClick={editSettings}>{data.date ? data.date.replaceAll('-', '. ') : '결혼 날짜를 설정해주세요'}<ChevronRight size={15}/></button></div><strong>{days === null ? 'D —' : days === 0 ? 'D-DAY' : days > 0 ? 'D − ' + days : 'D + ' + Math.abs(days)}</strong></section>
        <div className="w-section-title"><h2>차근차근, 함께 준비해요</h2><span>AT A GLANCE</span></div>
        <div className="w-overview">
          <button onClick={() => setTab(2)}><CheckCheck/><span>준비 체크리스트</span><strong>{done}<small> / {data.tasks.length}</small></strong><div className="w-progress"><i style={{ width: (data.tasks.length ? done / data.tasks.length * 100 : 0) + '%' }}/></div></button>
          <button onClick={() => setTab(3)}><Wallet/><span>기록한 예산</span><strong className="w-money">{money(total)}</strong><small>우리의 지출을 한눈에</small></button>
          <button onClick={() => setTab(1)}><MapPin/><span>우리의 장소</span><strong>{data.places.length}<small> 곳</small></strong><small>마음에 담은 공간들</small></button>
        </div>
        <button className="w-map-teaser" onClick={() => setTab(1)}><span><span className="w-eyebrow">PLACES TO SAY YES</span><h2>우리의 순간이 될 공간</h2><p>웨딩홀부터 스튜디오까지, 지도에 담아보세요.</p></span><span className="w-round-arrow"><ArrowUpRight/></span></button>
      </>}
      {tab === 1 && <>
        <div className="w-page-title"><div><span className="w-eyebrow">OUR WEDDING MAP</span><h1>마음에 담은 장소</h1><p>대한민국 곳곳, 우리의 시작이 될 공간을 찾아요.</p></div><button className="w-primary" onClick={() => addPlace(37.5665, 126.978)}><Plus size={17}/>장소 추가</button></div>
        <div className="w-map-layout"><KoreaMap places={data.places} onAdd={addPlace} onSelect={editPlace}/><aside className="w-places"><div className="w-section-title"><h2>저장한 장소</h2><span>{data.places.length} PLACES</span></div><label className="w-search"><span className="w-sr-only">장소 검색</span><input placeholder="제목이나 메모로 찾아보기" value={search} onChange={e => setSearch(e.target.value)}/></label><div className="w-place-list">{visiblePlaces.map(p => <button key={p.id} className="w-place-card" onClick={() => editPlace(p)}><span className="w-place-icon" style={{ background: p.color }}>{p.icon}</span><span><strong>{p.title}</strong><p>{p.body || '메모를 남겨보세요'}</p><small>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</small></span><ChevronRight size={16}/></button>)}</div>{!visiblePlaces.length && <div className="w-empty"><MapPin/><h3>{search ? '찾는 장소가 없어요' : '첫 장소를 남겨볼까요?'}</h3><p>{search ? '다른 검색어로 찾아보세요.' : '지도를 누르거나 장소 추가 버튼을 눌러주세요. 저장한 마커는 언제든 수정할 수 있어요.'}</p></div>}<p id="w-map-help" className="w-helper">드래그로 이동 · + / − 버튼 또는 두 손가락으로 확대<br/>키보드: 방향키 이동 · Enter로 중앙에 추가</p></aside></div>
      </>}
      {tab === 2 && <>
        <div className="w-page-title"><div><span className="w-eyebrow">ONE STEP AT A TIME</span><h1>준비 체크리스트</h1><p>작은 체크 하나가, 우리의 날에 한 걸음 더.</p></div><span className="w-counter">{done} / {data.tasks.length}</span></div>
        <form className="w-inline-form" aria-label="할 일 추가" onSubmit={e => { e.preventDefault(); const title = String(new FormData(e.currentTarget).get('task') || '').trim(); if (title && save({ ...data, tasks: [...data.tasks, { id: crypto.randomUUID(), title, done: false }] })) e.currentTarget.reset() }}><input name="task" aria-label="새 할 일" placeholder="예: 웨딩홀 상담 예약하기" required maxLength={120}/><button className="w-primary"><Plus size={18}/>추가</button></form>
        <div className="w-list">{data.tasks.map(t => <div className="w-task" key={t.id}><label><input type="checkbox" checked={t.done} onChange={() => save({ ...data, tasks: data.tasks.map(item => item.id === t.id ? { ...item, done: !item.done } : item) })}/><span className={t.done ? 'done' : ''}>{t.title}</span></label><button className="w-icon-button" aria-label={t.title + ' 삭제'} onClick={() => save({ ...data, tasks: data.tasks.filter(item => item.id !== t.id) })}><Trash2 size={17}/></button></div>)}</div>
        {!data.tasks.length && <div className="w-empty"><CheckCheck/><h3>우리의 준비 목록을 시작해요</h3><p>상견례, 예식장 예약, 청첩장처럼 필요한 준비를 적어보세요.</p></div>}
      </>}
      {tab === 3 && <>
        <div className="w-page-title"><div><span className="w-eyebrow">A BEAUTIFUL PLAN</span><h1>우리의 예산</h1><p>소중한 날을 위한 선택, 꼼꼼하게 기록해요.</p></div></div><section className="w-budget-total"><span>기록한 총금액</span><strong>{money(total)}</strong><span>{data.expenses.length}개의 지출 항목</span></section>
        <form className="w-inline-form w-expense-form" aria-label="예산 항목 추가" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); const title = String(form.get('expense') || '').trim(), amount = Number(form.get('amount')); if (title && Number.isFinite(amount) && amount >= 0 && save({ ...data, expenses: [...data.expenses, { id: crypto.randomUUID(), title, amount }] })) e.currentTarget.reset() }}><input name="expense" aria-label="예산 항목" required maxLength={120} placeholder="예: 웨딩홀 계약금"/><input name="amount" aria-label="금액 (원)" type="number" required min="0" max="100000000000" step="1" placeholder="금액 (원)"/><button className="w-primary"><Plus size={18}/>추가</button></form>
        <div className="w-list">{data.expenses.map(item => <div className="w-expense" key={item.id}><span>{item.title}</span><strong>{money(item.amount)}</strong><button className="w-icon-button" aria-label={item.title + ' 삭제'} onClick={() => save({ ...data, expenses: data.expenses.filter(e => e.id !== item.id) })}><Trash2 size={17}/></button></div>)}</div>{!data.expenses.length && <div className="w-empty"><Wallet/><h3>첫 지출을 기록해보세요</h3><p>예식, 촬영, 드레스 등 준비 비용을 한곳에 모아요.</p></div>}
      </>}
      {tab === 4 && <>
        <div className="w-page-title"><div><span className="w-eyebrow">LITTLE THINGS, BIG MEMORIES</span><h1>우리의 준비 노트</h1><p>잊고 싶지 않은 아이디어와 상담 내용을 남겨요.</p></div><button className="w-primary" onClick={() => editNote({ id: crypto.randomUUID(), title: '', body: '' })}><Plus size={17}/>노트 쓰기</button></div>
        <div className="w-notes">{data.notes.map(n => <button key={n.id} className="w-note" onClick={() => editNote(n)}><NotebookPen size={20}/><h2>{n.title}</h2><p>{n.body || '내용을 작성해보세요'}</p><span>수정하기 <ArrowUpRight size={15}/></span></button>)}</div>{!data.notes.length && <div className="w-empty"><NotebookPen/><h3>우리만의 이야기를 채워요</h3><p>웨딩 콘셉트, 상담 질문, 준비하며 나눈 대화를 남겨보세요.</p></div>}
      </>}
      <p className="w-storage-note">기록은 현재 브라우저에 계정별로 저장됩니다. 다른 기기와는 동기화되지 않아요.</p>
    </div>
    <nav className="w-bottom-tabs" aria-label="결혼준비 메뉴">{tabs.map((item, index) => <button key={item.name} type="button" aria-current={tab === index ? 'page' : undefined} className={tab === index ? 'active' : ''} onClick={() => setTab(index)}><item.icon size={21}/><span>{item.name}</span></button>)}</nav>
    <dialog ref={dialog} className="w-dialog" aria-label={place ? '장소 편집' : settings ? '결혼 정보' : '노트 편집'} onCancel={e => { e.preventDefault(); closeDialog() }} onClick={e => { if (e.target === e.currentTarget) closeDialog() }}>
      <form key={place?.id || note?.id || 'settings'} onSubmit={submit} aria-label={place ? '장소 편집' : settings ? '결혼 정보' : '노트 편집'}>
        <div className="w-dialog-title"><div><span className="w-eyebrow">{place ? 'A PLACE FOR US' : settings ? 'OUR SPECIAL DAY' : 'OUR NOTES'}</span><h2>{place ? (data.places.some(p => p.id === place.id) ? '장소 수정' : '새로운 장소') : settings ? '우리의 결혼 정보' : '준비 노트'}</h2></div><button type="button" className="w-icon-button" aria-label="닫기" onClick={closeDialog}><X size={21}/></button></div>
        {settings ? <><label>우리의 이름<input name="names" defaultValue={data.names} maxLength={80} placeholder="예: 지우 & 서준"/></label><label>결혼 날짜<input name="date" type="date" defaultValue={data.date}/></label></> : <>
          <label>제목<input name="title" autoFocus required maxLength={80} defaultValue={(place || note)?.title} placeholder={place ? '예: 마음에 든 웨딩홀' : '노트 제목'}/></label>
          <label>내용<textarea name="body" maxLength={4000} rows={4} defaultValue={(place || note)?.body} placeholder="상담 내용, 연락처, 느낌을 자유롭게 남겨보세요."/></label>
          {place && <><div className="w-field-row"><label>마커 색상<input name="color" type="color" value={place.color} onChange={e => setPlace({ ...place, color: e.target.value })}/></label><label>아이콘 (이모지 / 문자)<input name="icon" value={place.icon} maxLength={12} onChange={e => setPlace({ ...place, icon: e.target.value })}/></label><span className="w-pin-preview" style={{ background: place.color }}>{place.icon}</span></div><div className="w-icon-options" aria-label="추천 아이콘">{icons.map(icon => <button key={icon} type="button" aria-label={'아이콘 ' + icon} aria-pressed={place.icon === icon} onClick={() => setPlace({ ...place, icon })}>{icon}</button>)}</div><div className="w-field-row"><label>위도<input name="lat" type="number" step="any" min="-85" max="85" required defaultValue={place.lat}/></label><label>경도<input name="lng" type="number" step="any" min="-180" max="180" required defaultValue={place.lng}/></label></div><p className="w-helper">좌표를 수정하면 마커 위치도 함께 바뀝니다.</p></>}
        </>}
        {error && <p className="w-error" role="alert">{error}</p>}
        {deleting ? <div className="w-delete-confirm"><p>이 기록을 삭제할까요? 삭제 후에는 복원할 수 없어요.</p><button type="button" onClick={() => setDeleting(false)}>돌아가기</button><button type="button" className="w-danger" onClick={removeCurrent}>삭제 확인</button></div> : <div className="w-dialog-actions">{((place && data.places.some(p => p.id === place.id)) || (note && data.notes.some(n => n.id === note.id))) && <button type="button" className="w-danger" onClick={() => setDeleting(true)}><Trash2 size={16}/>삭제</button>}<button type="button" className="w-secondary" onClick={closeDialog}>취소</button><button className="w-primary" type="submit"><Check size={17}/>저장하기</button></div>}
      </form>
    </dialog>
  </section>
}
