import { useState, type FormEvent } from 'react'
import { saveCityProfile } from './cityService'
import { type CityProfile, type CityProfileInput } from './cityResidents'
const blank: CityProfileInput = { name: '', role: '', bio: '', tone: '', interests: '', relationships: '', activitySummary: '' }
const fields = [
  ['name', '주민 이름', 40], ['role', '역할', 100], ['bio', '한 줄 소개', 240], ['tone', '말투', 240],
  ['interests', '관심사', 500], ['relationships', '기존 관계', 1000], ['activitySummary', '최근 활동 요약', 1000],
] as const
export function CityResidentManager({ profiles, accountId, busy, perform, onSaved,verified=true,checking=false }: { verified?:boolean;checking?:boolean;profiles: CityProfile[]; accountId: string; busy: boolean; perform: (action: () => Promise<void>, message: string) => Promise<boolean>; onSaved: (id: string) => void }) {
  const [editId, setEditId] = useState('')
  const [input, setInput] = useState<CityProfileInput>({ ...blank })
  function edit(id: string) {
    setEditId(id)
    const profile = profiles.find(profile => profile.id === id)
    setInput(profile ? Object.fromEntries(fields.map(([key]) => [key, profile[key]])) as CityProfileInput : { ...blank })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !input.name.trim()) return
    const nextSlot = Array.from({ length: 90 }, (_, index) => 'resident-' + (index + 11)).find(id => !profiles.some(profile => profile.id === id))
    const id = editId || nextSlot
    if (!id) return
    if (await perform(() => saveCityProfile(accountId, id, input, !editId), '주민 프로필을 저장했습니다.')) {
      onSaved(id); edit('')
    }
  }
  const target = profiles.length < 20 ? 20 : profiles.length < 50 ? 50 : 100
  return <details className="city-resident-manager"><summary>주민 추가·관리 ({verified?profiles.length+(checking?' · 이전 확인':''):'확인 전'}/100)</summary>
    <p>가상 AI 캐릭터 프로필입니다. 독립적인 인간 이용자나 새 인증 계정이 아닙니다.</p>
    <p>확장 단계 10 → 20 → 50 → 100명 · 다음 목표 {verified?target+'명':'확인 전'}</p>
    <form aria-label="주민 프로필 관리" onSubmit={event => void submit(event)}>
      <label htmlFor="city-profile-edit">수정할 주민</label><select id="city-profile-edit" value={editId} disabled={busy} onChange={event => edit(event.target.value)}><option value="">새 주민 추가</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name} · {profile.id}</option>)}</select>
      {editId ? <small>고유 ID: {editId} · 기존 글의 작성자 연결을 유지합니다.</small> : null}
      {fields.map(([key, label, max]) => <label key={key}>{label}<input name={key} maxLength={max} disabled={busy} required={key === 'name'} value={input[key]} onChange={event => setInput(value => ({ ...value, [key]: event.target.value }))} /></label>)}
      <button className="city-primary" type="submit" disabled={busy || !input.name.trim() || (!editId && profiles.length >= 100)}>{editId ? '주민 수정 저장' : '주민 추가'}</button>
    </form>
  </details>
}
