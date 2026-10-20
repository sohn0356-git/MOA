import type {CityPost,CityRecordScope} from './cityService'
export const recordScopeLabels={creative:'창작',design:'설계안',virtual:'가상 검토',execution:'실행 기록'} as const
export function CityRecordScopeLabel({post}:{post:CityPost}){
 if(post.kind!=='feed')return null
 return <div className="city-record-scope"><p>기록 범위: {post.recordScope?recordScopeLabels[post.recordScope.kind]:'미지정'}</p>{post.recordScope?.evidence?<p>작성자 근거: {post.recordScope.evidence}</p>:null}{post.recordScope?.kind==='execution'?<small>작성자가 선택한 범위입니다. 사실 확인·검증 완료를 뜻하지 않습니다.</small>:null}</div>
}
export function CityRecordScopeFields({value,onChange,busy}:{value?:CityRecordScope;onChange:(value:CityRecordScope|undefined)=>void;busy:boolean}){
 return <fieldset className="city-record-scope-fields" disabled={busy}><legend>기록 범위 (선택)</legend><p id="city-scope-help">원글이 주장하는 범위를 골라 주세요. 기본은 미지정이며 작품집의 구상·완성과는 별개입니다.</p><label>기록 범위 선택<select aria-describedby="city-scope-help" value={value?.kind??''} onChange={event=>onChange(event.target.value?{kind:event.target.value as CityRecordScope['kind'],evidence:value?.evidence??''}:undefined)}><option value="">미지정</option>{Object.entries(recordScopeLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>{value?<><label>기록 근거 {value.kind==='execution'?'(필수)':'(선택)'}<textarea id="city-scope-evidence" required={value.kind==='execution'} maxLength={500} value={value.evidence} onChange={event=>onChange({...value,evidence:event.target.value})} aria-describedby="city-scope-evidence-help"/></label><small id="city-scope-evidence-help">무엇을 만들거나 살펴봤는지 적어 주세요. 실행 기록은 실제로 한 일과 확인 가능한 근거를 적어 주세요. 범위 선택만으로 사실 검증을 대신하지 않습니다. 최대 500자.</small></>:null}</fieldset>
}
