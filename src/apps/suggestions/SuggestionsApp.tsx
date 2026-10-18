import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './SuggestionsApp.css'
import { selectSuggestions, type SuggestionFilter, type SuggestionOrder } from './suggestionFilters'
import { get, onValue, push, ref, remove, update, type DataSnapshot } from 'firebase/database'
import { getFirebaseAuth, getFirebaseConfigError, getRealtimeDb } from '../../services/firebase'

type Suggestion = {
  id: string
  authorName: string
  authorUid: string
  body: string
  completedAt: number | null
  completedByName: string
  completedByUid: string
  createdAt: number
  isCompleted: boolean
  title: string
  updatedAt: number
}

type StoredSuggestion = {
  authorName?: unknown
  authorUid?: unknown
  body?: unknown
  completedAt?: unknown
  completedByName?: unknown
  completedByUid?: unknown
  createdAt?: unknown
  isCompleted?: unknown
  title?: unknown
  updatedAt?: unknown
}

const SUGGESTIONS_PATH = 'suggestions'
const TITLE_MAX_LENGTH = 80
const BODY_MAX_LENGTH = 1200

function handleBackHome() {
  history.pushState('', document.title, window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

function toTimestamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function mapSuggestionSnapshot(id: string, data: StoredSuggestion): Suggestion {
  return {
    id,
    authorName: String(data.authorName ?? 'MOA 사용자'),
    authorUid: String(data.authorUid ?? ''),
    body: String(data.body ?? ''),
    completedAt: toTimestamp(data.completedAt) || null,
    completedByName: String(data.completedByName ?? ''),
    completedByUid: String(data.completedByUid ?? ''),
    createdAt: toTimestamp(data.createdAt),
    isCompleted: data.isCompleted === true,
    title: String(data.title ?? ''),
    updatedAt: toTimestamp(data.updatedAt),
  }
}

function mapSuggestions(snapshot: DataSnapshot) {
  const value = snapshot.val() as Record<string, StoredSuggestion> | null

  if (!value) {
    return []
  }

  return Object.entries(value)
    .map(([id, data]) => mapSuggestionSnapshot(id, data))
    .filter((suggestion) => suggestion.title.trim() && suggestion.authorUid)
    .sort((firstSuggestion, secondSuggestion) => {
      if (firstSuggestion.isCompleted !== secondSuggestion.isCompleted) {
        return firstSuggestion.isCompleted ? 1 : -1
      }

      return secondSuggestion.createdAt - firstSuggestion.createdAt
    })
}

function formatDateTime(timestamp: number) {
  if (!timestamp) {
    return ''
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function getDisplayName() {
  const user = getFirebaseAuth().currentUser
  return user?.displayName || user?.email?.split('@')[0] || 'MOA 사용자'
}

export function SuggestionsApp({ embedded = false }: { embedded?: boolean } = {}) {
  const configError = useMemo(() => getFirebaseConfigError(), [])
  const currentUser = getFirebaseAuth().currentUser
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(configError)
  const [isLoading, setIsLoading] = useState(!configError)
  const [isMutating, setIsMutating] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [statusFilter, setStatusFilter] = useState<SuggestionFilter>('all')
  const [sortOrder, setSortOrder] = useState<SuggestionOrder>('newest')
  const visibleSuggestions = useMemo(() => selectSuggestions(suggestions, statusFilter, sortOrder), [suggestions, statusFilter, sortOrder])

  useEffect(() => {
    if (configError) {
      return undefined
    }

    const suggestionsRef = ref(getRealtimeDb(), SUGGESTIONS_PATH)
    return onValue(
      suggestionsRef,
      (snapshot) => {
        setSuggestions(mapSuggestions(snapshot))
        setError(null)
        setIsLoading(false)
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setIsLoading(false)
      },
    )
  }, [configError])

  async function handleCreateSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextTitle = title.trim()
    const nextBody = body.trim()

    if (!currentUser || !nextTitle || !nextBody) {
      return
    }

    setIsMutating(true)
    setError(null)

    try {
      const now = Date.now()
      const suggestionRef = push(ref(getRealtimeDb(), SUGGESTIONS_PATH))
      await update(suggestionRef, {
        authorName: getDisplayName(),
        authorUid: currentUser.uid,
        body: nextBody.slice(0, BODY_MAX_LENGTH),
        completedAt: 0,
        completedByName: '',
        completedByUid: '',
        createdAt: now,
        isCompleted: false,
        title: nextTitle.slice(0, TITLE_MAX_LENGTH),
        updatedAt: now,
      })
      setTitle('')
      setBody('')
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : '건의 등록에 실패했습니다.')
    } finally {
      setIsMutating(false)
    }
  }

  async function handleToggleSuggestion(suggestion: Suggestion) {
    if (!currentUser) {
      return
    }

    setIsMutating(true)
    setError(null)

    try {
      const now = Date.now()
      const isCompleted = !suggestion.isCompleted
      const suggestionRef = ref(getRealtimeDb(), `${SUGGESTIONS_PATH}/${suggestion.id}`)
      const snapshot = await get(suggestionRef)

      if (!snapshot.exists()) {
        throw new Error('건의 글을 찾을 수 없습니다.')
      }

      await update(suggestionRef, {
        completedAt: isCompleted ? now : 0,
        completedByName: isCompleted ? getDisplayName() : '',
        completedByUid: isCompleted ? currentUser.uid : '',
        isCompleted,
        updatedAt: now,
      })
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : '완료 상태 변경에 실패했습니다.')
    } finally {
      setIsMutating(false)
    }
  }

  async function handleEditSuggestion(event: FormEvent<HTMLFormElement>, suggestion: Suggestion) {
    event.preventDefault()
    if (isMutating || !currentUser || suggestion.authorUid !== currentUser.uid || !editTitle.trim() || !editBody.trim()) return
    setIsMutating(true)
    setError(null)
    try {
      await update(ref(getRealtimeDb(), `${SUGGESTIONS_PATH}/${suggestion.id}`), {
        title: editTitle.trim().slice(0, TITLE_MAX_LENGTH),
        body: editBody.trim().slice(0, BODY_MAX_LENGTH),
        updatedAt: Date.now(),
      })
      setEditingId('')
    } catch {
      setError('의견을 수정하지 못했습니다. 권한과 연결 상태를 확인하고 다시 시도해 주세요.')
    } finally {
      setIsMutating(false)
    }
  }

  async function handleDeleteSuggestion(suggestion: Suggestion) {
    if (isMutating || !currentUser || suggestion.authorUid !== currentUser.uid) return
    if (!window.confirm('이 개선 의견을 삭제할까요? 삭제한 의견은 복구할 수 없습니다.')) return
    setIsMutating(true)
    setError(null)
    try {
      await remove(ref(getRealtimeDb(), `${SUGGESTIONS_PATH}/${suggestion.id}`))
      if (editingId === suggestion.id) setEditingId('')
    } catch {
      setError('의견을 삭제하지 못했습니다. 권한과 연결 상태를 확인하고 다시 시도해 주세요.')
    } finally {
      setIsMutating(false)
    }
  }

  const openCount = suggestions.filter((suggestion) => !suggestion.isCompleted).length
  const doneCount = suggestions.length - openCount

  return (
    <section className={`sub-app utility-app suggestions-app ${embedded ? 'suggestions-app-embedded' : ''}`}>
      <header className="utility-header">
        {!embedded ? <button
          aria-label="Back to apps"
          className="nav-icon-button"
          type="button"
          onClick={handleBackHome}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M15.7 5.3a1 1 0 0 1 0 1.4L10.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z" />
          </svg>
        </button> : null}
        <div>
          <h2>{embedded ? '앱 개선' : '건의함'}</h2>
          <p>모두가 볼 수 있는 건의 글을 남기고 완료 여부를 확인합니다.</p>
        </div>
      </header>

      <form className="utility-panel suggestion-composer" onSubmit={(event) => void handleCreateSuggestion(event)}>
        <label className="field-label">
          <span>제목</span>
          <input
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="개선이 필요한 부분을 짧게 적어주세요."
            value={title}
          />
        </label>
        <label className="field-label">
          <span>내용</span>
          <textarea
            maxLength={BODY_MAX_LENGTH}
            onChange={(event) => setBody(event.target.value)}
            placeholder="상황, 원하는 결과, 참고할 내용을 함께 적어주세요."
            rows={5}
            value={body}
          />
        </label>
        <div className="suggestion-composer-footer">
          <span>{body.trim().length}/{BODY_MAX_LENGTH}자</span>
          <button disabled={isMutating || !title.trim() || !body.trim()} type="submit">
            등록
          </button>
        </div>
      </form>

      <section className="suggestion-board" aria-label="건의 목록">
        <div className="suggestion-controls">
          <div className="suggestion-summary" role="group" aria-label="개선 상태 필터">
            <button type="button" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>전체 {suggestions.length}</button>
            <button type="button" aria-pressed={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>미완료 {openCount}</button>
            <button type="button" aria-pressed={statusFilter === 'done'} onClick={() => setStatusFilter('done')}>완료 {doneCount}</button>
          </div>
          <label className="suggestion-sort">
            정렬
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SuggestionOrder)}>
              <option value="newest">최신순</option>
              <option value="oldest">오래된 순</option>
            </select>
          </label>
        </div>

        {error ? <p className="app-error">{error}</p> : null}
        {isLoading ? <p className="suggestion-empty">건의함을 불러오는 중입니다.</p> : null}
        {!isLoading && visibleSuggestions.length === 0 ? <p className="suggestion-empty">{suggestions.length ? '선택한 상태의 건의가 없습니다.' : '아직 등록된 건의가 없습니다.'}</p> : null}

        <div className="suggestion-list">
          {visibleSuggestions.map((suggestion) => (
            <article
              className={`suggestion-item ${suggestion.isCompleted ? 'suggestion-item-complete' : ''}`}
              key={suggestion.id}
            >
              <label className="suggestion-status">
                <input
                  checked={suggestion.isCompleted}
                  disabled={isMutating}
                  type="checkbox"
                  onChange={() => void handleToggleSuggestion(suggestion)}
                />
                <span>{suggestion.isCompleted ? '완료' : '미완료'}</span>
              </label>
              <div className="suggestion-content">
                {editingId === suggestion.id ? (
                  <form className="suggestion-edit-form" aria-label="개선 의견 수정" onSubmit={(event) => void handleEditSuggestion(event, suggestion)}>
                    <label>제목<input required maxLength={TITLE_MAX_LENGTH} value={editTitle} disabled={isMutating} onChange={(event) => setEditTitle(event.target.value)} /></label>
                    <label>내용<textarea required rows={4} maxLength={BODY_MAX_LENGTH} value={editBody} disabled={isMutating} onChange={(event) => setEditBody(event.target.value)} /></label>
                    <div className="suggestion-edit-actions">
                      <button type="submit" disabled={isMutating || !editTitle.trim() || !editBody.trim()}>저장</button>
                      <button type="button" disabled={isMutating} onClick={() => setEditingId('')}>취소</button>
                    </div>
                  </form>
                ) : (
                  <><h3>{suggestion.title}</h3><p>{suggestion.body}</p></>
                )}
                {suggestion.authorUid === currentUser?.uid && editingId !== suggestion.id ? (
                  <div className="suggestion-edit-actions">
                    <button type="button" disabled={isMutating} onClick={() => { setEditingId(suggestion.id); setEditTitle(suggestion.title); setEditBody(suggestion.body); setError(null) }}>수정</button>
                    <button type="button" disabled={isMutating} onClick={() => void handleDeleteSuggestion(suggestion)}>삭제</button>
                  </div>
                ) : null}
                <footer>
                  <span>{suggestion.authorName}</span>
                  <time>{formatDateTime(suggestion.createdAt)}</time>
                  {suggestion.isCompleted && suggestion.completedByName ? (
                    <span>{suggestion.completedByName} 완료</span>
                  ) : null}
                </footer>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
