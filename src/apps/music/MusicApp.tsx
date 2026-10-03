import { ArrowLeft, Download, ListMusic, Music2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isFirebaseConfigured, requireFirebase } from '../../lib/firebase'
import {
  saveMusicTrack,
  seedTracks,
  subscribeValue,
  uploadMusicTrackAudio,
} from '../../services/socialService'
import type { MusicTrack } from '../../types/social'

function handleBackHome() {
  history.pushState('', document.title, window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

function listFromRecord<T>(value: Record<string, T> | null | undefined) {
  return value ? Object.values(value) : []
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '--:--'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

function downloadName(track: MusicTrack) {
  const baseName = `${track.artist}-${track.title}`.trim() || track.id || 'moa-track'
  return `${baseName.replace(/[^\w.-]+/g, '-')}.mp3`
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function MusicApp() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [tracks, setTracks] = useState<MusicTrack[]>(Object.values(seedTracks))
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [autoPlayNotice, setAutoPlayNotice] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const playableTracks = useMemo(() => tracks.filter((track) => track.audioUrl), [tracks])
  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? playableTracks[0] ?? tracks[0],
    [playableTracks, selectedTrackId, tracks],
  )

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsLoading(false)
      setError('Firebase 환경 변수가 설정되지 않았습니다.')
      return undefined
    }

    setError('')
    setIsLoading(true)

    const unsubscribe = subscribeValue<Record<string, MusicTrack>>('musicTracks', (value) => {
      const nextTracks = listFromRecord(value)
      setTracks(nextTracks.length > 0 ? nextTracks : Object.values(seedTracks))
      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!selectedTrackId && selectedTrack) {
      setSelectedTrackId(selectedTrack.id)
      return
    }

    if (selectedTrackId && tracks.every((track) => track.id !== selectedTrackId)) {
      setSelectedTrackId(selectedTrack?.id ?? '')
    }
  }, [selectedTrack, selectedTrackId, tracks])

  useEffect(() => {
    if (!selectedTrack?.audioUrl || !audioRef.current) {
      return
    }

    const audio = audioRef.current
    audio.load()

    const playPromise = audio.play()
    if (!playPromise) {
      return
    }

    playPromise
      .then(() => setAutoPlayNotice(''))
      .catch(() => {
        setAutoPlayNotice('자동 재생이 브라우저에서 차단됐습니다. 재생 버튼을 누르세요.')
      })
  }, [selectedTrack?.audioUrl, selectedTrack?.id])

  async function handleUploadAudio(file: File | undefined) {
    if (!file) {
      return
    }

    const titleFromFile = file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled'
    const nextId = slugify(titleFromFile) || crypto.randomUUID()

    setIsUploading(true)
    setError('')
    setMessage('')

    try {
      const user = requireFirebase().auth.currentUser
      if (!user) {
        throw new Error('로그인 후 업로드할 수 있습니다.')
      }

      const audioUrl = await uploadMusicTrackAudio(user.uid, nextId, file)
      const durationSeconds = await readAudioDuration(file)

      const nextTrack: MusicTrack = {
        id: nextId,
        title: titleFromFile,
        artist: 'MOA',
        audioUrl,
        durationSeconds: durationSeconds ? Math.round(durationSeconds) : 0,
        active: true,
      }

      await saveMusicTrack(nextTrack)
      setSelectedTrackId(nextId)
      setMessage('업로드했고 노래 제목으로 Firebase에 저장했습니다.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '업로드하지 못했습니다.')
    } finally {
      setIsUploading(false)
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
          <p>Firebase에 등록된 음악을 재생합니다.</p>
        </div>
        <div className="music-key-pill">
          <ListMusic aria-hidden="true" size={16} />
          <span>{isLoading ? 'Loading' : `${playableTracks.length}/${tracks.length} playable`}</span>
        </div>
      </header>

      <div className="music-layout">
        <section className="music-results music-now-playing" aria-labelledby="music-now-playing-heading">
          <div className="music-results-header">
            <div>
              <h3 id="music-now-playing-heading">Now Playing</h3>
              <p>{selectedTrack?.audioUrl ? selectedTrack.audioUrl : 'No playable track selected'}</p>
            </div>
          </div>

          {selectedTrack?.audioUrl ? (
            <div className="music-player">
              <div className="music-cover-placeholder">
                <Music2 aria-hidden="true" size={34} />
              </div>
              <div className="music-player-copy">
                <strong>{selectedTrack.title}</strong>
                <span>
                  {selectedTrack.artist} · {formatDuration(selectedTrack.durationSeconds)}
                </span>
              </div>
              <audio
                autoPlay
                controls
                key={selectedTrack.id}
                playsInline
                ref={audioRef}
                src={selectedTrack.audioUrl}
              >
                <track kind="captions" />
              </audio>
              <a className="music-download-button" href={selectedTrack.audioUrl} download={downloadName(selectedTrack)}>
                <Download aria-hidden="true" size={18} />
                다운로드
              </a>
            </div>
          ) : (
            <div className="music-empty-state">
              <Music2 aria-hidden="true" size={34} />
              <p>Firebase `musicTracks` 문서에 재생 가능한 `audioUrl`을 등록하면 여기에 표시됩니다.</p>
            </div>
          )}

          {error ? <p className="app-error">{error}</p> : null}
          {autoPlayNotice ? <p className="app-muted">{autoPlayNotice}</p> : null}
        </section>

        <section className="music-library" aria-labelledby="music-library-heading">
          <div className="music-results-header">
            <div>
              <h3 id="music-library-heading">Library</h3>
              <p>{isLoading ? '불러오는 중' : `${tracks.length} tracks`}</p>
            </div>
          </div>

          <div className="music-track-list">
            {tracks.map((track) => {
              const isSelected = track.id === selectedTrack?.id
              const isPlayable = Boolean(track.audioUrl)

              return (
                <button
                  className="music-track-row"
                  data-active={isSelected}
                  disabled={!isPlayable}
                  key={track.id}
                  type="button"
                  onClick={() => setSelectedTrackId(track.id)}
                >
                  <span className="music-track-icon" aria-hidden="true">
                    <Music2 size={18} />
                  </span>
                  <span>
                    <strong>{track.title}</strong>
                    <small>
                      {track.artist} · {formatDuration(track.durationSeconds)}
                    </small>
                  </span>
                  <em>{isPlayable ? 'Play' : 'No URL'}</em>
                </button>
              )
            })}
          </div>
        </section>

        <section className="music-compose music-editor" aria-labelledby="music-upload-heading">
          <div className="music-results-header">
            <div>
              <h3 id="music-upload-heading">Upload</h3>
              <p>파일 하나만 선택하면 나머지는 자동으로 저장됩니다.</p>
            </div>
          </div>

          <label className="music-file-input">
            <span>Music file</span>
            <input
              accept="audio/*"
              disabled={isUploading}
              type="file"
              onChange={(event) => void handleUploadAudio(event.target.files?.[0])}
            />
          </label>

          {isUploading ? (
            <p className="app-muted">
              <Upload aria-hidden="true" size={16} />
              업로드 중
            </p>
          ) : null}

          {message ? <p className="app-muted">{message}</p> : null}
        </section>
      </div>
    </section>
  )
}

function readAudioDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const audio = document.createElement('audio')
    const url = URL.createObjectURL(file)

    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(audio.duration) ? audio.duration : null)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    audio.src = url
  })
}
