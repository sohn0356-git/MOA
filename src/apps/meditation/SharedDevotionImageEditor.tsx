import { useEffect, useRef, useState } from 'react'
import { update, ref } from 'firebase/database'
import { ImagePlus } from 'lucide-react'
import { getFaithAuth, getFaithDb } from '../../services/faithSession'
import { BEFORE_APP_UPDATE } from '../../lib/appUpdateProtocol'
import { DevotionImagePicker } from './DevotionImagePicker'
import { isDevotionImage } from './devotionImage'
import { collaborativeDevotionImageUpdates, type PublicDevotionImageTarget } from './collaborativeDevotionImage'

export function SharedDevotionImageEditor({ actorUid, target, image, disabled = false, onSaved }: {
  actorUid: string; target: PublicDevotionImageTarget; image: string; disabled?: boolean; onSaved: (image: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [base, setBase] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draftNotice, setDraftNotice] = useState('')
  const generation = useRef(0)
  const storageKey = 'moa.faith.sharedImageDraft.v1:' + encodeURIComponent(actorUid) + ':' + encodeURIComponent(target.publicId)
  useEffect(() => () => { generation.current++ }, [])
  const changed = value !== base
  useEffect(() => {
    const guard = (event: Event) => {
      if (!editing || !(changed || preparing || saving)) return
      event.preventDefault()
      setError('그림 수정 중입니다. 저장하거나 수정 화면을 닫은 뒤 업데이트해주세요.')
    }
    const unload = (event: BeforeUnloadEvent) => {
      if (!editing || !(changed || preparing || saving)) return
      event.preventDefault(); event.returnValue = ''
    }
    window.addEventListener(BEFORE_APP_UPDATE, guard); window.addEventListener('beforeunload', unload)
    return () => { window.removeEventListener(BEFORE_APP_UPDATE, guard); window.removeEventListener('beforeunload', unload) }
  }, [editing, changed, preparing, saving])
  function open() {
    const current = isDevotionImage(image) ? image : ''
    setBase(current); setValue(current); setError(''); setDraftNotice('')
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (draft && (draft.image === '' || isDevotionImage(draft.image))) {
        setValue(draft.image); setDraftNotice('임시저장한 그림 수정을 복원했습니다.')
      }
    } catch { setError('그림 임시저장을 읽지 못했습니다. 브라우저 저장 설정을 확인해주세요.') }
    setEditing(true)
  }
  function change(next: string) {
    setValue(next); setError('')
    try {
      localStorage.setItem(storageKey, JSON.stringify({ image: next, updatedAt: Date.now() }))
      setDraftNotice('그림 수정 자동 임시저장됨')
    } catch {
      setDraftNotice(''); setError('그림 임시저장에 실패했습니다. 저장 전에는 화면을 닫지 마세요.')
    }
  }
  async function save() {
    if (disabled || saving || preparing || !changed) return
    if (getFaithAuth().currentUser?.uid !== actorUid) { setError('선택한 활동 계정을 확인한 뒤 다시 시도해주세요.'); return }
    setSaving(true); setError('')
    const version = generation.current
    try {
      await update(ref(getFaithDb()), collaborativeDevotionImageUpdates(target, value))
      let cleanupError = ''
      try { localStorage.removeItem(storageKey) } catch { cleanupError = '그림은 저장됐지만 임시저장을 정리하지 못했습니다.' }
      if (generation.current !== version) return
      onSaved(value); setBase(value); setEditing(false); setError(cleanupError); setDraftNotice('')
    } catch {
      if (generation.current === version) setError('그림을 저장하지 못했습니다. 공개 상태가 바뀌었거나 연결에 문제가 있을 수 있어요. 선택한 그림은 유지했습니다.')
    } finally { if (generation.current === version) setSaving(false) }
  }
  return <section className="faith-shared-image-edit" aria-label="공개 묵상 그림 편집">
    {!editing ? <button className="faith-outline-button" type="button" disabled={disabled} onClick={open}>
      <ImagePlus size={17} aria-hidden="true" />{image ? '공개 묵상 그림 수정' : '공개 묵상 그림 추가'}
    </button> : <>
      <p className="faith-helper">전체 공개 묵상의 그림은 로그인한 누구나 수정할 수 있어요. 본문과 작성자는 그대로 유지됩니다.</p>
      <DevotionImagePicker value={value} onChange={change} onBusyChange={setPreparing} disabled={disabled || saving} />
      <div className="faith-detail-actions">
        <button className="faith-primary" type="button" disabled={disabled || saving || preparing || !changed} onClick={() => void save()}>{saving ? '저장 중' : '그림 수정 저장'}</button>
        <button className="faith-text-button" type="button" disabled={saving || preparing} onClick={() => { setEditing(false); setError('') }}>닫기</button>
      </div>
      {draftNotice && <p role="status">{draftNotice}</p>}
    </>}
    {error && <p role="alert" className="faith-image-error">{error}</p>}
  </section>
}
