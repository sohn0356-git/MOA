import { ArrowLeft, Download, KeyRound, Music2, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type KeyInfo = {
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
const apiKey = import.meta.env.VITE_MUSICFUL_API_KEY as string | undefined

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

async function requestMusicful<T>(path: string, init: RequestInit = {}) {
  if (!apiKey) {
    throw new Error('VITE_MUSICFUL_API_KEY secret이 설정되지 않았습니다.')
  }

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

  if (status === 1 || status === 2) {
    return '완료'
  }

  if (status < 0) {
    return '실패'
  }

  return '생성 중'
}

function downloadName(task: MusicTask) {
  const baseName = task.title?.trim() || task.song_id || task.id || 'musicful-track'
  return `${baseName.replace(/[^\w.-]+/g, '-')}.mp3`
}

export function MusicApp() {
  const [title, setTitle] = useState('MOA Song')
  const [style, setStyle] = useState('K-pop, bright synth, clean vocal, energetic chorus')
  const [lyrics, setLyrics] = useState('')
  const [model, setModel] = useState('MFV3.0')
  const [gender, setGender] = useState('')
  const [instrumental, setInstrumental] = useState(false)
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [tasks, setTasks] = useState<MusicTask[]>([])
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [downloadingTaskId, setDownloadingTaskId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const hasApiKey = Boolean(apiKey)
  const latestPlayableTask = useMemo(() => tasks.find((task) => task.audio_url), [tasks])

  useEffect(() => {
    if (!apiKey) {
      setError('GitHub Pages secret VITE_MUSICFUL_API_KEY를 설정해야 합니다.')
      return
    }

    void loadKeyInfo()
  }, [])

  async function loadKeyInfo() {
    setError('')

    try {
      const info = await requestMusicful<KeyInfo>('/get_api_key_info')
      setKeyInfo(info)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  async function refreshTasks(ids = taskIds) {
    if (ids.length === 0) {
      return
    }

    setError('')
    setIsRefreshing(true)

    try {
      const searchParams = new URLSearchParams({ ids: ids.join(',') })
      const nextTasks = await requestMusicful<MusicTask[]>(`/music/tasks?${searchParams.toString()}`)
      setTasks(nextTasks)
      setMessage('작업 상태를 갱신했습니다.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsRefreshing(false)
    }
  }

  async function generateMusic() {
    if (!style.trim()) {
      setError('스타일을 입력하세요.')
      return
    }

    if (!instrumental && !lyrics.trim()) {
      setError('가사를 입력하거나 Instrumental을 켜세요.')
      return
    }

    setError('')
    setMessage('')
    setIsGenerating(true)

    try {
      const hasLyrics = !instrumental && lyrics.trim().length > 0
      const payload = await requestMusicful<GenerateResponse>('/music/generate', {
        method: 'POST',
        body: JSON.stringify({
          action: hasLyrics ? 'custom' : 'auto',
          title: title.trim(),
          style: style.trim(),
          lyrics: hasLyrics ? lyrics.trim() : undefined,
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
      setTasks([])
      setMessage('음악 생성 작업을 시작했습니다. 완료까지 시간이 걸릴 수 있습니다.')
      await refreshTasks(nextTaskIds)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsGenerating(false)
    }
  }

  async function downloadTrack(task: MusicTask) {
    if (!task.audio_url) {
      return
    }

    setDownloadingTaskId(task.id)

    try {
      const response = await fetch(task.audio_url)
      if (!response.ok) {
        throw new Error('오디오 다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = downloadName(task)
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(task.audio_url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingTaskId('')
    }
  }

  return (
    <section className="sub-app utility-app music-app">
      <header className="music-header">
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
          <p>가사와 스타일을 입력해 Musicful 트랙을 생성합니다.</p>
        </div>
        <div className="music-key-pill">
          <KeyRound aria-hidden="true" size={16} />
          <span>{keyInfo ? `${keyInfo.key_music_counts ?? '-'} left` : hasApiKey ? 'API ready' : 'No API key'}</span>
        </div>
      </header>

      <div className="music-layout">
        <form
          className="music-compose"
          onSubmit={(event) => {
            event.preventDefault()
            void generateMusic()
          }}
        >
          <label>
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} />
          </label>

          <label>
            <span>Style</span>
            <textarea
              rows={4}
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              placeholder="장르, 분위기, 악기, 보컬 톤을 입력하세요."
            />
          </label>

          <label>
            <span>Lyrics</span>
            <textarea
              rows={10}
              value={lyrics}
              disabled={instrumental}
              onChange={(event) => setLyrics(event.target.value)}
              placeholder="[Verse]&#10;...&#10;&#10;[Chorus]&#10;..."
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

          <div className="music-action-row">
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
          </div>

          {message ? <p className="app-muted">{message}</p> : null}
          {error ? <p className="app-error">{error}</p> : null}
        </form>

        <section className="music-results" aria-labelledby="music-results-heading">
          <div className="music-results-header">
            <div>
              <h3 id="music-results-heading">Result</h3>
              <p>{taskIds.length > 0 ? taskIds.join(', ') : 'No generation yet'}</p>
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

          {latestPlayableTask ? (
            <div className="music-player">
              {latestPlayableTask.cover_url ? (
                <img src={latestPlayableTask.cover_url} alt="" />
              ) : (
                <div className="music-cover-placeholder">
                  <Music2 aria-hidden="true" size={34} />
                </div>
              )}
              <div className="music-player-copy">
                <strong>{latestPlayableTask.title ?? title}</strong>
                <span>{latestPlayableTask.style ?? style}</span>
              </div>
              <audio controls src={latestPlayableTask.audio_url ?? undefined}>
                <track kind="captions" />
              </audio>
              <button
                className="music-download-button"
                type="button"
                onClick={() => void downloadTrack(latestPlayableTask)}
              >
                <Download aria-hidden="true" size={18} />
                {downloadingTaskId === latestPlayableTask.id ? '다운로드 중' : '다운로드'}
              </button>
            </div>
          ) : (
            <div className="music-empty-state">
              <Music2 aria-hidden="true" size={34} />
              <p>생성 결과가 준비되면 플레이어와 다운로드 버튼이 표시됩니다.</p>
            </div>
          )}

          <div className="music-task-list">
            {tasks.map((task) => (
              <article className="music-task" key={task.id}>
                <div>
                  <strong>{task.title ?? task.id}</strong>
                  <span>{statusLabel(task.status)}</span>
                </div>
                {task.fail_reason ? <p>{task.fail_reason}</p> : null}
                {task.audio_url ? (
                  <button type="button" onClick={() => void downloadTrack(task)}>
                    <Download aria-hidden="true" size={16} />
                    {downloadingTaskId === task.id ? '다운로드 중' : '다운로드'}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
