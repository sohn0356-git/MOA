import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { get, onValue, push, ref, update, type DataSnapshot } from 'firebase/database'
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

export function SuggestionsApp() {
  const configError = useMemo(() => getFirebaseConfigError(), [])
  const currentUser = getFirebaseAuth().currentUser
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(configError)
  const [isLoading, setIsLoading] = useState(!configError)
  const [isMutating, setIsMutating] = useState(false)

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

  const openCount = suggestions.filter((suggestion) => !suggestion.isCompleted).length
  const doneCount = suggestions.length - openCount

  return (
    <section className="sub-app utility-app suggestions-app">
      <header className="utility-header">
        <button
          aria-label="Back to apps"
          className="nav-icon-button"
          type="button"
          onClick={handleBackHome}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M15.7 5.3a1 1 0 0 1 0 1.4L10.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z" />
          </svg>
        </button>
        <div>
          <h2>건의함</h2>
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
        <div className="suggestion-summary">
          <strong>전체 {suggestions.length}</strong>
          <span>미완료 {openCount}</span>
          <span>완료 {doneCount}</span>
        </div>

        {error ? <p className="app-error">{error}</p> : null}
        {isLoading ? <p className="suggestion-empty">건의함을 불러오는 중입니다.</p> : null}
        {!isLoading && suggestions.length === 0 ? <p className="suggestion-empty">아직 등록된 건의가 없습니다.</p> : null}

        <div className="suggestion-list">
          {suggestions.map((suggestion) => (
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
                <h3>{suggestion.title}</h3>
                <p>{suggestion.body}</p>
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
