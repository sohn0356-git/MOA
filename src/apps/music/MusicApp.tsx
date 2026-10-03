import { ArrowLeft, Download, KeyRound, Music2, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

type GeneratedTrack = {
  audioUrl: string
  filename: string
  songId: string
}

const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined
const elevenLabsMusicUrl = 'https://api.elevenlabs.io/v1/music/stream'

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

function downloadName(title: string) {
  const baseName = title.trim() || 'elevenlabs-track'
  return `${baseName.replace(/[^\w.-]+/g, '-')}.mp3`
}

function buildPrompt(title: string, style: string, lyrics: string, instrumental: boolean) {
  const lines = [
    title.trim() ? `Title: ${title.trim()}` : '',
    `Style: ${style.trim()}`,
    instrumental ? 'Create an instrumental track with no vocals.' : '',
    !instrumental && lyrics.trim() ? `Lyrics:\n${lyrics.trim()}` : '',
  ].filter(Boolean)

  return lines.join('\n\n')
}

export function MusicApp() {
  const [title, setTitle] = useState('MOA Song')
  const [style, setStyle] = useState('K-pop, bright synth, clean vocal, energetic chorus')
  const [lyrics, setLyrics] = useState('')
  const [model, setModel] = useState('music_v2_5')
  const [durationSeconds, setDurationSeconds] = useState(30)
  const [instrumental, setInstrumental] = useState(false)
  const [track, setTrack] = useState<GeneratedTrack | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const hasApiKey = Boolean(elevenLabsApiKey)
  const promptPreview = useMemo(
    () => buildPrompt(title, style, lyrics, instrumental),
    [instrumental, lyrics, style, title],
  )

  async function generateMusic() {
    if (!elevenLabsApiKey) {
      setError('GitHub Pages secret VITE_ELEVENLABS_API_KEY를 설정해야 합니다.')
      return
    }

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
      const response = await fetch(`${elevenLabsMusicUrl}?output_format=mp3_48000_192`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify({
          prompt: promptPreview,
          model_id: model,
          music_length_ms: durationSeconds * 1000,
          force_instrumental: instrumental,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? ''
        const payload = contentType.includes('application/json') ? await response.json() : await response.text()
        const detail = typeof payload === 'object' && payload && 'detail' in payload ? payload.detail : payload
        throw new Error(typeof detail === 'string' ? detail : `ElevenLabs API error ${response.status}`)
      }

      if (track?.audioUrl) {
        URL.revokeObjectURL(track.audioUrl)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      setTrack({
        audioUrl,
        filename: downloadName(title),
        songId: response.headers.get('song-id') ?? '',
      })
      setMessage('음악 생성이 완료됐습니다.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsGenerating(false)
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
          <p>가사와 스타일을 입력해 ElevenLabs 트랙을 생성합니다.</p>
        </div>
        <div className="music-key-pill">
          <KeyRound aria-hidden="true" size={16} />
          <span>{hasApiKey ? 'ElevenLabs ready' : 'No API key'}</span>
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
                <option value="music_v2_5">music_v2_5</option>
                <option value="music_v2">music_v2</option>
                <option value="music_v1">music_v1</option>
              </select>
            </label>
            <label>
              <span>Length</span>
              <input
                max={180}
                min={3}
                type="number"
                value={durationSeconds}
                onChange={(event) => setDurationSeconds(Number(event.target.value))}
              />
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
              <p>{track?.songId ? `song-id: ${track.songId}` : 'No generation yet'}</p>
            </div>
          </div>

          {track ? (
            <div className="music-player">
              <div className="music-cover-placeholder">
                <Music2 aria-hidden="true" size={34} />
              </div>
              <div className="music-player-copy">
                <strong>{title || 'Generated track'}</strong>
                <span>{style}</span>
              </div>
              <audio controls src={track.audioUrl}>
                <track kind="captions" />
              </audio>
              <a className="music-download-button" href={track.audioUrl} download={track.filename}>
                <Download aria-hidden="true" size={18} />
                다운로드
              </a>
            </div>
          ) : (
            <div className="music-empty-state">
              <Music2 aria-hidden="true" size={34} />
              <p>생성이 끝나면 플레이어와 다운로드 버튼이 표시됩니다.</p>
            </div>
          )}

          <div className="music-prompt-preview">
            <strong>Prompt</strong>
            <p>{promptPreview || '스타일과 가사를 입력하세요.'}</p>
          </div>
        </section>
      </div>
    </section>
  )
}
