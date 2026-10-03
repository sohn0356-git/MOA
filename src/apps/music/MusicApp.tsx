import { ArrowLeft, Download, ListMusic, Music2, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { isFirebaseConfigured, requireFirebase } from '../../lib/firebase'
import {
  deleteMusicTrack,
  saveMusicTrack,
  seedTracks,
  subscribeValue,
  uploadMusicTrackAudio,
} from '../../services/socialService'
import type { MusicTrack } from '../../types/social'

type MusicTrackForm = {
  id: string
  title: string
  artist: string
  audioUrl: string
  durationSeconds: string
  active: boolean
}

const emptyTrackForm: MusicTrackForm = {
  id: '',
  title: '',
  artist: '',
  audioUrl: '',
  durationSeconds: '',
  active: true,
}

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

function formFromTrack(track: MusicTrack): MusicTrackForm {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    audioUrl: track.audioUrl,
    durationSeconds: String(track.durationSeconds || ''),
    active: track.active,
  }
}

export function MusicApp() {
  const [tracks, setTracks] = useState<MusicTrack[]>(Object.values(seedTracks))
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [form, setForm] = useState<MusicTrackForm>(emptyTrackForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
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

  function updateForm<Key extends keyof MusicTrackForm>(key: Key, value: MusicTrackForm[Key]) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }))
  }

  function handleEditTrack(track: MusicTrack) {
    setSelectedTrackId(track.id)
    setForm(formFromTrack(track))
    setError('')
    setMessage('')
  }

  function handleNewTrack() {
    setForm(emptyTrackForm)
    setError('')
    setMessage('')
  }

  async function handleSaveTrack() {
    const nextId = form.id.trim() || slugify(`${form.artist}-${form.title}`)
    const durationSeconds = Number(form.durationSeconds)

    if (!nextId) {
      setError('문서 ID 또는 제목/아티스트를 입력하세요.')
      return
    }

    if (!form.title.trim() || !form.artist.trim()) {
      setError('제목과 아티스트를 입력하세요.')
      return
    }

    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      setError('재생 시간은 0 이상의 숫자로 입력하세요.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      await saveMusicTrack({
        id: nextId,
        title: form.title.trim(),
        artist: form.artist.trim(),
        audioUrl: form.audioUrl.trim(),
        durationSeconds,
        active: form.active,
      })
      setSelectedTrackId(nextId)
      setForm((currentForm) => ({ ...currentForm, id: nextId }))
      setMessage('Firebase에 저장했습니다.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '저장하지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUploadAudio(file: File | undefined) {
    if (!file) {
      return
    }

    const nextId = form.id.trim() || slugify(`${form.artist}-${form.title}`) || crypto.randomUUID()

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
      setForm((currentForm) => ({
        ...currentForm,
        id: currentForm.id.trim() || nextId,
        audioUrl,
        durationSeconds: durationSeconds ? String(Math.round(durationSeconds)) : currentForm.durationSeconds,
        title: currentForm.title.trim() || file.name.replace(/\.[^.]+$/, ''),
      }))
      setMessage('Storage에 업로드했고 Audio URL을 채웠습니다. 저장을 누르면 musicTracks 문서에 반영됩니다.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '업로드하지 못했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteTrack() {
    if (!form.id.trim()) {
      setError('삭제할 문서 ID가 없습니다.')
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      await deleteMusicTrack(form.id.trim())
      setSelectedTrackId('')
      setForm(emptyTrackForm)
      setMessage('Firebase에서 삭제했습니다.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '삭제하지 못했습니다.')
    } finally {
      setIsSaving(false)
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
                  onClick={() => handleEditTrack(track)}
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

        <form
          className="music-compose music-editor"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSaveTrack()
          }}
        >
          <div className="music-results-header">
            <div>
              <h3>Write</h3>
              <p>musicTracks 문서를 추가하거나 수정합니다.</p>
            </div>
            <button className="nav-icon-button" type="button" aria-label="New track" onClick={handleNewTrack}>
              <Plus aria-hidden="true" size={18} />
            </button>
          </div>

          <label>
            <span>Document ID</span>
            <input
              value={form.id}
              onChange={(event) => updateForm('id', event.target.value)}
              placeholder="artist-title"
            />
          </label>

          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
          </label>

          <label>
            <span>Artist</span>
            <input value={form.artist} onChange={(event) => updateForm('artist', event.target.value)} />
          </label>

          <label>
            <span>Audio URL</span>
            <input
              value={form.audioUrl}
              onChange={(event) => updateForm('audioUrl', event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label>
            <span>Upload audio</span>
            <input
              accept="audio/*"
              disabled={isUploading}
              type="file"
              onChange={(event) => void handleUploadAudio(event.target.files?.[0])}
            />
          </label>

          <label>
            <span>Duration seconds</span>
            <input
              min={0}
              type="number"
              value={form.durationSeconds}
              onChange={(event) => updateForm('durationSeconds', event.target.value)}
            />
          </label>

          <div className="music-action-row">
            <label className="music-toggle">
              <input
                checked={form.active}
                type="checkbox"
                onChange={(event) => updateForm('active', event.target.checked)}
              />
              <span>Active</span>
            </label>

            <div className="music-editor-actions">
              <button
                className="music-delete-button"
                disabled={isSaving || isUploading || !form.id.trim()}
                type="button"
                onClick={() => void handleDeleteTrack()}
              >
                <Trash2 aria-hidden="true" size={18} />
                삭제
              </button>
              <button className="music-primary-button" disabled={isSaving || isUploading} type="submit">
                {isUploading ? <Upload aria-hidden="true" size={18} /> : <Save aria-hidden="true" size={18} />}
                {isUploading ? '업로드 중' : isSaving ? '저장 중' : '저장'}
              </button>
            </div>
          </div>

          {message ? <p className="app-muted">{message}</p> : null}
        </form>
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
