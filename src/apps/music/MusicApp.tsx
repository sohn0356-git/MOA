import { ArrowLeft, Download, ListMusic, Music2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { isFirebaseConfigured } from '../../lib/firebase'
import { seedTracks, subscribeValue } from '../../services/socialService'
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

export function MusicApp() {
  const [tracks, setTracks] = useState<MusicTrack[]>(Object.values(seedTracks))
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
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
              <audio key={selectedTrack.id} controls src={selectedTrack.audioUrl}>
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
      </div>
    </section>
  )
}
