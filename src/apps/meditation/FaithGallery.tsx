import { useEffect, useRef, useState, type ReactNode, type Ref, type CSSProperties } from 'react'
import { normalizeFeedGroup, DEFAULT_FEED_GROUP } from './feedGroups'
import './FaithGallery.css'

type Photo = { id: string; publicId?: string; imageUrl: string; caption: string; authorName?: string; groupName?: string }
export function FaithGallery<T extends Photo>({ photos, groups, selectedGroup, onSelectGroup, onAddGroup, header, renderDetail, limit, sentinelRef }: {
  photos: T[]; groups: string[]; selectedGroup: string; onSelectGroup: (group: string) => void
  onAddGroup: (group: string) => void; header: ReactNode; renderDetail: (photo: T, close: () => void) => ReactNode
  limit: number; sentinelRef: Ref<HTMLDivElement>
}) {
  const [opened, setOpened] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const photo = photos.find(item => (item.publicId || item.id) === opened)
  const filtered = photos.filter(item => !selectedGroup || normalizeFeedGroup(item.groupName) === selectedGroup)
  const allGroups = [...new Set([DEFAULT_FEED_GROUP, ...groups, ...photos.map(item => normalizeFeedGroup(item.groupName))])]
  const close = () => { dialog.current?.close(); setOpened('') }
  useEffect(() => {
    if (photo && !dialog.current?.open) dialog.current?.showModal()
    if (!photo) dialog.current?.close()
  }, [photo])
  return <div className="faith-gallery-layout">
    <nav className="faith-bookshelf" aria-label="피드 그룹">
      <span className="faith-bookshelf-heading">그룹</span>
      {['', ...allGroups].map((group, index) => <button type="button" key={group} className="faith-book-spine" aria-pressed={selectedGroup === group}
        style={{ '--spine-hue': String((index * 47 + 145) % 360) } as CSSProperties}
        onClick={() => onSelectGroup(group)}><span>{group || '전체'}</span></button>)}
      <button type="button" className="faith-group-add" aria-label="피드 그룹 추가" title="피드 그룹 추가" onClick={() => setAdding(!adding)}>＋</button>
    </nav>
    <div className="faith-gallery-body">
      {header}
      {adding && <form className="faith-group-form" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; onAddGroup(normalizeFeedGroup(name)); setName(''); setAdding(false) }}>
        <label>새 그룹 이름<input autoFocus maxLength={40} value={name} onChange={event => setName(event.target.value)} /></label>
        <button type="submit">추가</button><button type="button" onClick={() => setAdding(false)}>취소</button>
      </form>}
      <div className="faith-gallery-heading"><div><span>SHARED MOMENTS</span><h3>{selectedGroup || '모든 나눔'}</h3></div><small>{filtered.length}개의 기록</small></div>
      <div className="faith-gallery-grid">
        {filtered.slice(0, limit).map(item => <button type="button" className="faith-gallery-tile" key={item.publicId || item.id}
          aria-label={(item.authorName || '이웃') + '의 묵상 보기: ' + item.caption.slice(0, 60)} onClick={() => setOpened(item.publicId || item.id)}>
          <div className="faith-gallery-art">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="faith-gallery-placeholder"><svg viewBox="0 0 100 120" aria-hidden="true"><path d="M44 10h12v34h28v12H56v54H44V56H16V44h28z" fill="currentColor" /></svg><span>말씀으로 남긴 마음</span></div>}
          <span className="faith-gallery-group">{normalizeFeedGroup(item.groupName)}</span></div>
          <div className="faith-gallery-caption"><strong>{item.caption.split('\n').find(Boolean) || '오늘의 십자가'}</strong><span>{item.authorName || '이웃의 나눔'}</span></div>
        </button>)}
      </div>
      {!filtered.length && <p className="faith-gallery-empty">아직 나눔이 없어요. 묵상을 작성할 때 이 그룹을 선택해보세요.</p>}
      <div ref={sentinelRef} aria-hidden="true" className="faith-feed-sentinel" />
    </div>
    <dialog className="faith-gallery-dialog" ref={dialog} aria-label="나눔 상세" onClose={() => setOpened('')} onClick={event => { if (event.target === event.currentTarget) close() }}>
      <button type="button" className="faith-gallery-close" aria-label="묵상 닫기" onClick={close}>×</button>
      {photo && renderDetail(photo, close)}
    </dialog>
  </div>
}
