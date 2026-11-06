import { Images, FolderHeart, Plus, UserRound, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { normalizeFeedGroup, DEFAULT_FEED_GROUP } from './feedGroups'
import './FaithGallery.css'

type Photo = { id: string; publicId?: string; imageUrl: string; caption: string; authorName?: string; groupName?: string }
export function FaithGallery<T extends Photo>({ photos, groups, selectedGroup, onSelectGroup, onAddGroup, header, renderDetail, limit, sentinelRef, view = 'public', onViewChange }: {
  photos: T[]; groups: string[]; selectedGroup: string; onSelectGroup: (group: string) => void
  onAddGroup: (group: string) => void; header: ReactNode; renderDetail: (photo: T, close: () => void) => ReactNode
  limit: number; sentinelRef: Ref<HTMLDivElement>; view?: 'public' | 'mine'; onViewChange?: (view: 'public' | 'mine') => void
}) {
  const [bookmarksOpen, setBookmarksOpen] = useState(true)
  const bookmarksId = useId()
  const [opened, setOpened] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const photo = photos.find(item => (item.publicId || item.id) === opened)
  const filtered = photos.filter(item => !selectedGroup || normalizeFeedGroup(item.groupName) === selectedGroup)
  const allGroups = [...new Set([DEFAULT_FEED_GROUP, ...groups.map(normalizeFeedGroup), ...photos.map(item => normalizeFeedGroup(item.groupName))])]
  const close = () => { dialog.current?.close(); setOpened('') }
  useEffect(() => {
    if (photo && !dialog.current?.open) dialog.current?.showModal()
    if (!photo && dialog.current?.open) dialog.current.close()
  }, [photo])
  return <div className="faith-gallery-layout" data-bookmarks-open={bookmarksOpen}>
    <aside className="faith-bookmark-rail">
      <button type="button" className="faith-bookmark-toggle" aria-label={bookmarksOpen ? '책갈피 접기' : '책갈피 펼치기'}
        title={bookmarksOpen ? '책갈피 접기' : '책갈피 펼치기'} aria-expanded={bookmarksOpen} aria-controls={bookmarksId}
        onClick={() => setBookmarksOpen(open => !open)}>
        {bookmarksOpen ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
      </button>
    <nav id={bookmarksId} hidden={!bookmarksOpen} className="faith-bookshelf" aria-label="피드 그룹">
      
      {onViewChange && <button type="button" className="faith-book-spine" aria-pressed={view === 'mine'} onClick={() => onViewChange('mine')}><span className="faith-group-avatar"><UserRound aria-hidden="true" /></span><span className="faith-group-label">내 글</span></button>}
      {['', ...allGroups].map(group => <button type="button" key={group} className="faith-book-spine" aria-pressed={view === 'public' && selectedGroup === group}
        onClick={() => { onViewChange?.('public'); onSelectGroup(group) }}><span className="faith-group-avatar">{group ? <FolderHeart aria-hidden="true" /> : <Images aria-hidden="true" />}</span><span className="faith-group-label">{group || '공개 피드'}</span></button>)}
      <button type="button" className="faith-group-add" aria-label="피드 그룹 추가" title="피드 그룹 추가" onClick={() => setAdding(!adding)}><Plus aria-hidden="true" /></button>
    </nav>
    </aside>
    <div className="faith-gallery-body">
      {header}
      {adding && <form className="faith-group-form" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; onViewChange?.('public'); onAddGroup(normalizeFeedGroup(name)); setName(''); setAdding(false) }}>
        <label>공개 그룹 이름<input autoFocus maxLength={40} value={name} onChange={event => setName(event.target.value)} /></label>
        <button type="submit">추가</button><button type="button" onClick={() => setAdding(false)}>취소</button>
      </form>}
      <div className="faith-gallery-grid">
        {filtered.slice(0, limit).map(item => <button type="button" className="faith-gallery-tile" key={item.publicId || item.id}
          aria-label={(item.authorName || '이웃') + '의 묵상 보기: ' + item.caption.slice(0, 60)} onClick={() => setOpened(item.publicId || item.id)}>
          <div className="faith-gallery-art">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="faith-gallery-placeholder"><svg viewBox="0 0 100 120" aria-hidden="true"><path d="M44 10h12v34h28v12H56v54H44V56H16V44h28z" fill="currentColor" /></svg></div>}
</div>
        </button>)}
      </div>
      {!filtered.length && <p className="faith-gallery-empty">{view === 'mine' ? '아직 내 글이 없어요. 내 공개 글과 나만 보기 묵상을 이곳에서 모아볼 수 있어요.' : '아직 공개 글이 없어요. 글을 올릴 때 공개 그룹을 지정해보세요.'}</p>}
      <div ref={sentinelRef} aria-hidden="true" className="faith-feed-sentinel" />
    </div>
    <dialog className="faith-gallery-dialog" ref={dialog} aria-label="나눔 상세" onClose={() => setOpened('')} onClick={event => { if (event.target === event.currentTarget) close() }}>
      <button type="button" className="faith-gallery-close" aria-label="묵상 닫기" onClick={close}>×</button>
      {photo && renderDetail(photo, close)}
    </dialog>
  </div>
}
