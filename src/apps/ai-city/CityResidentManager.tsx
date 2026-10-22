import {citySummaryLimit,citySummaryError} from './cityProfileValidation'
import {CitySummaryHistory} from './CitySummaryHistory'
import { useRef,useState, type FormEvent } from 'react'
import { saveCityProfile } from './cityService'
import { type CityProfile, type CityProfileInput } from './cityResidents'
const blank: CityProfileInput = { name: '', role: '', bio: '', tone: '', interests: '', relationships: '', activitySummary: '' }
const fields = [
  ['name', '주민 이름', 40], ['role', '역할', 100], ['bio', '한 줄 소개', 240], ['tone', '말투', 240],
  ['interests', '관심사', 500], ['relationships', '기존 관계', 1000], ['activitySummary', '최근 활동 요약', 1000],
] as const
export function CityResidentManager({ profiles, accountId, busy, perform, onSaved,residentId=accountId,verified=true,checking=false }: { residentId?:string;verified?:boolean;checking?:boolean;profiles: CityProfile[]; accountId: string; busy: boolean; perform: (action: () => Promise<void>, message: string) => Promise<boolean>; onSaved: (id: string) => void }) {
  const [editId, setEditId] = useState('')
  const [input, setInput] = useState<CityProfileInput>({ ...blank })
  const composing=useRef(false),summaryRef=useRef<HTMLTextAreaElement>(null)
  const [attempted,setAttempted]=useState(false),[isComposing,setComposing]=useState(false)
  const summaryError=citySummaryError(input.activitySummary)
  function edit(id: string) {
    setAttempted(false)
    setEditId(id)
    const profile = profiles.find(profile => profile.id === id)
    setInput(profile ? Object.fromEntries(fields.map(([key]) => [key, profile[key]])) as CityProfileInput : { ...blank })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !input.name.trim() || composing.current) return
    setAttempted(true);if(summaryError){summaryRef.current?.focus();return}
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
      {fields.map(([key, label, max]) => key==='activitySummary'?<div key={key}><label htmlFor="city-summary-budget">최근 활동 요약</label><p id="city-summary-budget-help">최대 {citySummaryLimit}자. 자동으로 지우거나 압축하지 않습니다. 현재 과제와 지난 결과 중 남길 내용을 직접 고르세요.</p><details><summary>저장된 요약과 비교하며 정리</summary><p className="city-summary-before">{profiles.find(p=>p.id===editId)?.activitySummary||'저장된 요약 없음'}</p></details><textarea id="city-summary-budget" name={key} ref={summaryRef} disabled={busy} value={input.activitySummary} aria-invalid={!isComposing&&Boolean(summaryError)} aria-describedby={'city-summary-budget-help city-summary-budget-count'+(!isComposing&&summaryError?' city-summary-budget-error':'')} onCompositionStart={()=>{composing.current=true;setComposing(true)}} onCompositionEnd={e=>{const value=e.currentTarget.value;composing.current=false;setComposing(false);setInput(v=>({...v,activitySummary:value}))}} onChange={e=>setInput(v=>({...v,activitySummary:e.target.value}))}/><p id="city-summary-budget-count" role="status">{input.activitySummary.length}/{citySummaryLimit}자 · 남은 {Math.max(0,citySummaryLimit-input.activitySummary.length)}자{isComposing?' · 한글 조합 중':''}</p>{!isComposing&&summaryError?<p id="city-summary-budget-error" role={attempted?'alert':undefined}>{summaryError}</p>:null}</div>:<label key={key}>{label}<input name={key} maxLength={max} disabled={busy} required={key === 'name'} value={input[key]} onChange={event => setInput(value => ({ ...value, [key]: event.target.value }))} /></label>)}
      <button className="city-primary" type="submit" disabled={busy || !input.name.trim() || (!editId && profiles.length >= 100)}>{editId ? '주민 수정 저장' : '주민 추가'}</button>
    </form>
    {editId&&editId===residentId?<CitySummaryHistory key={editId} residentId={editId} accountId={accountId} busy={busy} perform={perform} onRestored={summary=>setInput(value=>({...value,activitySummary:summary}))}/>:editId?<p>요약 복원은 상단에서 같은 주민을 선택한 뒤 사용할 수 있습니다.</p>:null}
  </details>
}
