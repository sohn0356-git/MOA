import { ArrowLeft, KeyRound, Music2, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type KeyInfo = {
  x_api_key?: string
  key_status?: number
  key_music_counts?: number
  email?: string | null
  key_name?: string | null
}

type MusicTask = {
  id: string
  duration?: number
  status?: number
  title?: string | null
  style?: string | null
  audio_url?: string | null
  cover_url?: string | null
  song_id?: string | null
  lyric?: string | null
  fail_code?: number | null
  fail_reason?: string | null
}

type GenerateResponse = {
  id?: string
  task_id?: string
  taskId?: string
  ids?: string[]
  data?: GenerateResponse | GenerateResponse[]
}

const musicfulBaseUrl = 'https://api.musicful.ai/v1'
const localStorageKey = 'moa.musicful.apiKey'
const defaultApiKey = import.meta.env.VITE_MUSICFUL_API_KEY as string | undefined

function handleBackHome() {
  history.pushState('', document.title, window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return '요청을 처리하지 못했습니다.'
}

async function requestMusicful<T>(path: string, apiKey: string, init: RequestInit = {}) {
  const response = await fetch(`${musicfulBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      ...init.headers,
    },
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload && 'detail' in payload ? payload.detail : payload
    throw new Error(typeof detail === 'string' ? detail : `Musicful API error ${response.status}`)
  }

  return payload as T
}

function extractTaskIds(payload: GenerateResponse): string[] {
  if (Array.isArray(payload.data)) {
    return payload.data.flatMap(extractTaskIds)
  }

  if (payload.data) {
    return extractTaskIds(payload.data)
  }

  return [payload.id, payload.task_id, payload.taskId, ...(payload.ids ?? [])].filter(Boolean) as string[]
}

function statusLabel(status?: number) {
  if (status === undefined) {
    return '대기'
  }

  if (status === 1) {
    return '완료'
  }

  if (status < 0) {
    return '실패'
  }

  return `진행 중 (${status})`
}

export function MusicApp() {
  const [apiKey, setApiKey] = useState(defaultApiKey ?? '')
  const [style, setStyle] = useState('따뜻한 로파이 팝, 밤 산책, 선명한 멜로디')
  const [model, setModel] = useState('MFV3.0')
  const [gender, setGender] = useState('')
  const [instrumental, setInstrumental] = useState(false)
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [tasks, setTasks] = useState<MusicTask[]>([])
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const hasApiKey = apiKey.trim().length > 0
  const latestPlayableTask = useMemo(() => tasks.find((task) => task.audio_url), [tasks])

  useEffect(() => {
    const storedKey = window.localStorage.getItem(localStorageKey)

    if (storedKey) {
      setApiKey(storedKey)
    } else if (defaultApiKey) {
      window.localStorage.setItem(localStorageKey, defaultApiKey)
    }
  }, [])

  async function loadKeyInfo(nextApiKey = apiKey) {
    if (!nextApiKey.trim()) {
      setError('Musicful API key를 입력하세요.')
      return
    }

    setError('')
    setMessage('')
    setIsSavingKey(true)

    try {
      const info = await requestMusicful<KeyInfo>('/get_api_key_info', nextApiKey.trim())
      window.localStorage.setItem(localStorageKey, nextApiKey.trim())
      setKeyInfo(info)
      setMessage('API key를 로컬에 저장했고 상태를 확인했습니다.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSavingKey(false)
    }
  }

  async function refreshTasks(ids = taskIds) {
    if (!apiKey.trim() || ids.length === 0) {
      return
    }

    setError('')
    setIsRefreshing(true)

    try {
      const searchParams = new URLSearchParams({ ids: ids.join(',') })
      const nextTasks = await requestMusicful<MusicTask[]>(`/music/tasks?${searchParams.toString()}`, apiKey.trim())
      setTasks(nextTasks)
      setMessage('작업 상태를 갱신했습니다.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsRefreshing(false)
    }
  }

  async function generateMusic() {
    if (!apiKey.trim()) {
      setError('Musicful API key를 먼저 저장하세요.')
      return
    }

    if (!style.trim()) {
      setError('음악 스타일 프롬프트를 입력하세요.')
      return
    }

    setError('')
    setMessage('')
    setIsGenerating(true)

    try {
      const payload = await requestMusicful<GenerateResponse>('/music/generate', apiKey.trim(), {
        method: 'POST',
        body: JSON.stringify({
          action: 'auto',
          style: style.trim(),
          mv: model,
          instrumental: instrumental ? 1 : 0,
          gender,
        }),
      })
      const nextTaskIds = extractTaskIds(payload)

      if (nextTaskIds.length === 0) {
        setMessage('생성 요청은 완료됐지만 작업 ID를 응답에서 찾지 못했습니다.')
        return
      }

      setTaskIds(nextTaskIds)
      setMessage('음악 생성 작업을 시작했습니다. 잠시 후 상태를 새로고침하세요.')
      await refreshTasks(nextTaskIds)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="sub-app utility-app music-app">
      <header className="utility-header">
        <button
          aria-label="Back to apps"
          className="nav-icon-button"
          type="button"
          onClick={handleBackHome}
        >
          <ArrowLeft aria-hidden="true" size={20} />
        </button>
        <div>
          <h2>Music</h2>
          <p>Musicful API로 새 음악을 생성합니다.</p>
        </div>
      </header>

      <div className="music-layout">
        <form
          className="utility-panel music-form"
          onSubmit={(event) => {
            event.preventDefault()
            void generateMusic()
          }}
        >
          <label>
            <span>Musicful API key</span>
            <input
              autoComplete="off"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="x-api-key"
            />
          </label>
          <button
            className="music-secondary-button"
            disabled={isSavingKey || !hasApiKey}
            type="button"
            onClick={() => void loadKeyInfo()}
          >
            <KeyRound aria-hidden="true" size={18} />
            {isSavingKey ? '확인 중' : '키 저장 및 확인'}
          </button>

          {keyInfo ? (
            <dl className="music-key-info">
              <div>
                <dt>상태</dt>
                <dd>{keyInfo.key_status ?? '-'}</dd>
              </div>
              <div>
                <dt>남은 생성</dt>
                <dd>{keyInfo.key_music_counts ?? '-'}</dd>
              </div>
              <div>
                <dt>키 이름</dt>
                <dd>{keyInfo.key_name ?? keyInfo.email ?? '-'}</dd>
              </div>
            </dl>
          ) : null}

          <label>
            <span>Style prompt</span>
            <textarea
              rows={5}
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              placeholder="곡의 분위기, 장르, 악기, 보컬 느낌을 적어주세요."
            />
          </label>

          <div className="music-controls">
            <label>
              <span>Model</span>
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                <option value="MFV3.0">MFV3.0</option>
                <option value="MFV2.0">MFV2.0</option>
                <option value="MFV1.5X">MFV1.5X</option>
                <option value="MFV1.5">MFV1.5</option>
                <option value="MFV1.0">MFV1.0</option>
              </select>
            </label>
            <label>
              <span>Voice</span>
              <select value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="">Auto</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
          </div>

          <label className="music-toggle">
            <input
              checked={instrumental}
              type="checkbox"
              onChange={(event) => setInstrumental(event.target.checked)}
            />
            <span>Instrumental</span>
          </label>

          <button className="music-primary-button" disabled={isGenerating || !hasApiKey} type="submit">
            <Sparkles aria-hidden="true" size={18} />
            {isGenerating ? '생성 중' : '음악 생성'}
          </button>

          {message ? <p className="app-muted">{message}</p> : null}
          {error ? <p className="app-error">{error}</p> : null}
        </form>

        <div className="utility-panel music-results">
          <div className="music-results-header">
            <div>
              <h3>작업 결과</h3>
              <p>{taskIds.length > 0 ? taskIds.join(', ') : '아직 생성 작업이 없습니다.'}</p>
            </div>
            <button
              aria-label="Refresh music tasks"
              className="nav-icon-button"
              disabled={isRefreshing || taskIds.length === 0}
              type="button"
              onClick={() => void refreshTasks()}
            >
              <RefreshCw aria-hidden="true" size={18} />
            </button>
          </div>

          {latestPlayableTask?.audio_url ? (
            <div className="music-player">
              {latestPlayableTask.cover_url ? (
                <img src={latestPlayableTask.cover_url} alt="" />
              ) : (
                <div className="music-cover-placeholder">
                  <Music2 aria-hidden="true" size={34} />
                </div>
              )}
              <div>
                <strong>{latestPlayableTask.title ?? 'Generated track'}</strong>
                <span>{latestPlayableTask.style ?? style}</span>
              </div>
              <audio controls src={latestPlayableTask.audio_url}>
                <track kind="captions" />
              </audio>
            </div>
          ) : null}

          <div className="music-task-list">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <article className="music-task" key={task.id}>
                  <div>
                    <strong>{task.title ?? task.id}</strong>
                    <span>{statusLabel(task.status)}</span>
                  </div>
                  {task.fail_reason ? <p>{task.fail_reason}</p> : null}
                  {task.audio_url ? (
                    <a href={task.audio_url} target="_blank" rel="noreferrer">
                      오디오 열기
                    </a>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="app-muted">생성 후 작업 상태를 확인하면 결과가 표시됩니다.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
