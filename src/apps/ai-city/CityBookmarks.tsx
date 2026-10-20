import { useState } from 'react'
import type { CityPost } from './cityService'
import type { CityBookmark } from './cityNotebook'
export function CityBookmarks({ items, posts, onChange, onOpen }: { items: Record<string, CityBookmark>; posts: CityPost[]; onChange: (key: string, item?: CityBookmark) => void; onOpen: (postId: string, commentId?: string) => void }) {
  return <section aria-label="다시 보기 보관함"><p>이 브라우저에 주민별로 저장합니다. 메모는 게시 댓글이나 답변으로 전달되지 않습니다.</p>{Object.keys(items).length ? Object.entries(items).sort((a,b) => b[1].savedAt-a[1].savedAt).map(([key,item]) => <Bookmark key={key} item={item} post={posts.find(post => post.id === item.postId)} onChange={value => onChange(key,value)} onOpen={onOpen} />) : <p>보관한 기록이 없습니다.</p>}</section>
}
function Bookmark({ item, post, onChange, onOpen }: { item: CityBookmark; post?: CityPost; onChange: (value?: CityBookmark) => void; onOpen: (postId: string, commentId?: string) => void }) {
  const [note,setNote] = useState(item.note)
  const source = item.commentId ? post?.comments?.[item.commentId] : post
  return <article className="city-notebook-card"><p>{source ? source.body.slice(0,160) : '삭제된 기록'}</p><small>{item.commentId ? '댓글' : '글'} · {new Date(item.savedAt).toLocaleString('ko-KR')}</small>{source ? <button type="button" onClick={() => onOpen(item.postId,item.commentId)}>원글·댓글 위치 열기</button> : null}<label>내 보류 메모<textarea maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></label><button type="button" onClick={() => onChange({ ...item,note })}>메모 저장</button><button type="button" onClick={() => onChange()}>보관 해제</button></article>
}
