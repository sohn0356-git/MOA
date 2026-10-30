import { useEffect, useRef, useState } from 'react'
import { isDevotionImage, prepareDevotionImage } from './devotionImage'
import './DevotionImage.css'
export function DevotionImagePicker({ value, onChange, onBusyChange, disabled = false }: {
  value: string; onChange: (value: string) => void; onBusyChange: (busy: boolean) => void; disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  useEffect(() => () => { generation.current++ }, [])
  async function select(file?: File) {
    if (!file) return
    const version = ++generation.current
    setError(''); setBusy(true); onBusyChange(true)
    try {
      const image = await prepareDevotionImage(file)
      if (version === generation.current) onChange(image)
    } catch (error) {
      if (version === generation.current) setError(error instanceof Error ? error.message : '그림을 첨부하지 못했습니다.')
    } finally {
      if (version === generation.current) { setBusy(false); onBusyChange(false) }
    }
  }
  return <section className="faith-devotion-image-picker" aria-label="십자가 그림 첨부">
    <h4>십자가 그림 <small>(선택)</small></h4>
    <p>묵상과 함께 남기고 싶은 십자가 그림이나 사진을 선택하세요.</p>
    <label className="faith-file-field"><span>{value ? '다른 그림으로 바꾸기' : '십자가 그림 추가'}</span><input aria-label="십자가 그림 파일" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void select(file) }}/></label>
    <small>JPG · PNG · WebP, 최대 8MB</small>
    {busy && <p role="status">그림을 준비하고 있습니다…</p>}
    {error && <p className="faith-image-error" role="alert">{error}</p>}
    {isDevotionImage(value) && <figure><img src={value} alt="첨부한 십자가 그림 미리보기"/><button className="faith-text-button" type="button" disabled={disabled || busy} onClick={() => { generation.current++; setError(''); onChange('') }}>첨부 제거</button></figure>}
  </section>
}
export function DevotionImage({ value }: { value?: string }) {
  return isDevotionImage(value) ? <figure className="faith-devotion-image"><img src={value} alt="묵상에 첨부한 십자가 그림"/></figure> : null
}
