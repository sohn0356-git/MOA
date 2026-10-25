import {useEffect,useRef,useState,type CSSProperties} from 'react'
import type {CityPost,CityWork} from './cityService'
import type {CityProfile} from './cityResidents'
import type {CityBuildingId} from './cityBuildings'
import {CityImageView} from './CityImage'
import {useUpdateRecords,RecordReadState,type Perform} from './CityUpdates'
import {useCityEditor,CityEditorFeedback} from './cityEditor'
import type {Material} from './cityCollaboration'
import {publishSpace,respondToSpace,watchSpace,type SpaceSnapshot} from './citySpaceService'
import {spaceSources,sourceKey,spaceImpact,validateSpace,type SpaceInput,type SpaceReference,type SpaceSource,type SpaceVersion,type SpaceResponse} from './citySpaceModel'
import './CitySpaceUse.css'
const freshRef=():SpaceReference=>({kind:'post',sourceId:'',role:'source',conditionKind:'assumption',condition:'',x:0,y:0})
const fresh=(residentId:string):SpaceInput=>({residentId,parentId:'',title:'',purpose:'',question:'',endScope:'',reason:'',layout:'equal',status:'open',references:[freshRef(),{...freshRef(),x:55}]})
const conditionNames={measurement:'측정 상태',assumption:'계산용 가정',result:'결과'}
function SpaceReading({version,sources,profiles,onOpen,list}:{version:SpaceInput;sources:SpaceSource[];profiles:CityProfile[];onOpen:(id:string)=>void;list?:boolean}){
 return <div className={'space-source-grid space-'+(list?'ordered':version.layout)}>{version.references.map((r,i)=>{const s=sources.find(s=>s.key===sourceKey(r));return <article className="space-reference" key={sourceKey(r)||i} style={version.layout==='free'&&!list?{left:r.x*.65+'%',top:r.y*3.5+'px'} as CSSProperties:undefined}>
 <span className="space-order">읽는 순서 {i+1} · {r.role==='source'?'원자료':'파생안'}</span>
 <p className="space-condition"><strong>{conditionNames[r.conditionKind]}</strong> · {r.condition}</p>
 <h4>{s?.title??'연결 자료를 확인할 수 없습니다'}</h4><p className="space-meta">작성자: {profiles.find(p=>p.id===s?.authorId)?.name??s?.authorId??'확인 필요'} · {s?.status??'연결 확인 필요'}</p>
 {s?.kind==='material'?<details><summary>원자료 조건 읽기</summary><p>{s.conditions}</p></details>:null}
 {s?.post?.image?<CityImageView image={s.post.image}/>:<p className="space-meta">첨부 그림 없음 · 텍스트 자료</p>}
 <button type="button" disabled={!s?.postId} onClick={()=>s&&onOpen(s.postId)}>원문 열기 · {s?.title??'연결 확인 필요'}</button>
 </article>})}</div>
}
export function CitySpaceUse({buildingId,accountId,residentId,posts,works,profiles,ready,busy,perform,onOpen}:{buildingId:CityBuildingId;accountId:string;residentId:string;posts:CityPost[];works:CityWork[];profiles:CityProfile[];ready:boolean;busy:boolean;perform:Perform;onOpen:(id:string)=>void}){
 const materials=useUpdateRecords<Material>('materials')
 const [state,setState]=useState<SpaceSnapshot>({currentId:'',versions:[]}),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0)
 const [historyId,setHistoryId]=useState(()=>new URLSearchParams(window.location.search).get('space-version')??'')
 const [editing,setEditing]=useState(false),[input,setInput]=useState<SpaceInput>(()=>fresh(residentId)),[preview,setPreview]=useState<SpaceInput|null>(null),[error,setError]=useState(''),[list,setList]=useState(false)
 const [replacement,setReplacement]=useState<{index:number;key:string}|null>(null),[firstSource,setFirstSource]=useState(''),[reason,setReason]=useState('')
 const editor=useCityEditor(input),launch=useRef<HTMLButtonElement>(null),previewLaunch=useRef<HTMLElement|null>(null),reading=useRef<HTMLDivElement>(null)
 const sourceList=spaceSources(posts,works,materials.records),current=state.versions.find(v=>v.id===state.currentId),shown=state.versions.find(v=>v.id===historyId)??current
 const writable=ready&&loaded&&!failed&&materials.ready&&!materials.failed&&!busy
 const responses=useUpdateRecords<SpaceResponse>('spaceResponses/'+(shown?.id??'_none'))
 const dirty=useRef(false);dirty.current=editing&&editor.dirty
 useEffect(()=>{setLoaded(false);setFailed(false);try{return watchSpace(buildingId,value=>{setState(value);setLoaded(true);setFailed(false)},()=>{setLoaded(false);setFailed(true)})}catch{setFailed(true)}},[buildingId,retry])
 useEffect(()=>{
  const leave=(event:Event)=>{if(dirty.current&&!window.confirm('공개하지 않은 공간 편집을 버리고 이동할까요?'))event.preventDefault()}
  const unload=(event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue=''}}
  window.addEventListener('city:before-space-navigation',leave);window.addEventListener('moa:before-navigation',leave);window.addEventListener('beforeunload',unload)
  return()=>{window.removeEventListener('city:before-space-navigation',leave);window.removeEventListener('moa:before-navigation',leave);window.removeEventListener('beforeunload',unload)}
 },[])
 function start(){
  const base=shown??current,next:SpaceInput=base?{residentId,parentId:current?.id??'',title:base.title,purpose:base.purpose,question:base.question,endScope:base.endScope,reason:'',layout:base.layout,status:'open',references:base.references.map(r=>({...r}))}:fresh(residentId)
  setInput(next);editor.begin(next,launch.current);setPreview(null);setReplacement(null);setError('');setEditing(true)
 }
 function changeRef(index:number,patch:Partial<SpaceReference>){setInput(v=>({...v,references:v.references.map((r,i)=>i===index?{...r,...patch}:r)}))}
 function close(){setEditing(false);setPreview(null);setReplacement(null);editor.reset(fresh(residentId))}
 function cancelReplacement(){const index=replacement?.index;setReplacement(null);setTimeout(()=>document.getElementById('space-reference-'+buildingId+'-'+index)?.focus(),0)}
 const beforeReplacement=replacement?sourceList.find(s=>s.key===sourceKey(input.references[replacement.index])):undefined,newSource=replacement?sourceList.find(s=>s.key===replacement.key):undefined
 const influence=preview?spaceImpact(current,preview,sourceList):null
 return <section className="city-space-use" aria-label="이 장소의 임시 용도">
 <p className="space-eyebrow">ONE PLACE · MANY USES</p><h2>이 장소에서, 지금 하는 일</h2>
 <p className="space-meta">공간 방문은 참여나 담당 동의로 기록되지 않습니다. 기존 기능은 아래에서 계속 이용할 수 있습니다.</p>
 {!loaded?<p role="status">{failed?'공간 기록을 확인하지 못했습니다.':'공간 기록을 확인하는 중…'}{failed?<button type="button" onClick={()=>setRetry(v=>v+1)}>공간 기록 다시 확인</button>:null}</p>:null}
 {loaded&&!current?<p>아직 공개된 임시 용도가 없습니다. 기존 장소에 두 자료를 연결해 첫 용도를 열어 보세요.</p>:null}
 {historyId&&!state.versions.some(v=>v.id===historyId)&&loaded?<p role="status">요청한 이전 판을 확인할 수 없습니다. 현재 공개판과 기존 연결은 유지합니다.</p>:null}
 {shown?<div ref={reading} tabIndex={-1} aria-label="공간 공개판">
 <h3>{shown.title} <small>{shown.status==='closed'?'종료 기록':'열린 용도'}{shown.id!==state.currentId?' · 이전 판':''}</small></h3><p>{shown.purpose}</p>
 <p className="space-meta">제안자: {profiles.find(p=>p.id===shown.residentId)?.name??shown.residentId} · {new Date(shown.createdAt).toLocaleString('ko-KR')}</p>
 <p>이번 공간의 질문: {shown.question}</p><p>이번 회차의 종료 범위: {shown.endScope}</p><p>검토 이유: {shown.reason}</p>
 <button type="button" aria-pressed={list} onClick={()=>setList(v=>!v)}>{list?'저장된 배치로 보기':'같은 순서의 목록으로 보기'}</button>
 {ready&&materials.ready?<SpaceReading version={shown} sources={sourceList} profiles={profiles} onOpen={onOpen} list={list}/>:<p role="status">연결된 원자료를 확인하는 중…</p>}
 <div className="space-response"><h4>먼저 읽은 면과 이유</h4><p>정답·승패 통계를 만들지 않습니다. 답하지 않아도 모든 자료와 원문을 볼 수 있습니다.</p>
 <button type="button" onClick={()=>{setFirstSource('');setReason('');reading.current?.focus()}}>답하지 않고 쉬기 · 계속 읽기</button>
 {shown.id===state.currentId&&shown.status==='open'?<form onSubmit={async e=>{e.preventDefault();if(!firstSource||!reason.trim())return;if(await perform(()=>respondToSpace(accountId,buildingId,shown.id,residentId,firstSource,reason),'이번 판을 먼저 읽은 이유만 남겼습니다. 참여·담당 동의는 기록하지 않았습니다.')){setReason('');setFirstSource('')}}}>
 <label>먼저 읽은 자료<select required value={firstSource} disabled={!writable} onChange={e=>setFirstSource(e.target.value)}><option value="">선택하지 않음</option>{shown.references.map((r,i)=><option key={sourceKey(r)} value={sourceKey(r)}>{i+1}. {sourceList.find(s=>s.key===sourceKey(r))?.title??'연결 확인 필요'}</option>)}</select></label>
 <label>먼저 읽은 이유<textarea required maxLength={300} value={reason} disabled={!writable} onChange={e=>setReason(e.target.value)}/></label><button type="submit" disabled={!writable||!firstSource||!reason.trim()}>이번 판의 읽기 이유 남기기</button></form>:<p>이전 판과 종료 기록은 읽기 전용입니다.</p>}
 <RecordReadState state={responses}/>{responses.records.map(r=><p key={r.id}>{profiles.find(p=>p.id===r.residentId)?.name??r.residentId} · {sourceList.find(s=>s.key===r.firstSource)?.title??r.firstSource} · {r.reason}</p>)}
 </div></div>:null}
 {state.versions.length?<details className="space-history"><summary>공간의 이전 판과 종료 기록 ({state.versions.length})</summary>{state.versions.map(v=><article key={v.id}><h4>{v.title} · {v.status==='closed'?'종료':'공개'} · {v.id===state.currentId?'현재 판':'이전 판'}</h4><p>{v.reason}</p><button type="button" onClick={()=>{setHistoryId(v.id);setTimeout(()=>reading.current?.focus(),0)}}>이 판 읽기 · {v.title}</button> <a href={'?space-place='+buildingId+'&space-version='+encodeURIComponent(v.id)+'#/ai-city'}>이 판의 읽기 링크</a></article>)}</details>:null}
 <button type="button" ref={launch} disabled={!writable||editing} onClick={start}>공간의 쓰임 편집 · 새 판 만들기</button>
 {editing?<form className="space-use-editor" aria-label="공간의 쓰임 편집" onSubmit={e=>{e.preventDefault();const validation=validateSpace(input,sourceList);setError(validation);if(!validation){previewLaunch.current=document.activeElement as HTMLElement;setPreview({...input,references:input.references.map(r=>({...r}))})}}}>
 <p>이 공간의 참조를 바꿉니다. 다른 주민의 원자료를 수정하는 도구가 아닙니다.</p>
 {(['title','purpose','question','endScope','reason'] as const).map((key,i)=><label key={key}>{['임시 공간 이름','이번 임시 용도','이번 공간에서 묻는 질문','이번 회차 종료 범위','제안·검토 이유'][i]}<textarea required maxLength={key==='title'?100:key==='question'||key==='endScope'?300:500} value={input[key]} disabled={busy||Boolean(preview)} onChange={e=>setInput(v=>({...v,[key]:e.target.value}))}/></label>)}
 <label>자료 배치<select value={input.layout} disabled={busy||Boolean(preview)} onChange={e=>setInput(v=>({...v,layout:e.target.value as SpaceInput['layout']}))}><option value="equal">같은 높이로 비교</option><option value="ordered">읽는 순서대로</option><option value="free">자유 배치 · 목록 대안 유지</option></select></label>
 <label>새 판의 용도<select value={input.status} disabled={busy||Boolean(preview)} onChange={e=>setInput(v=>({...v,status:e.target.value as SpaceInput['status']}))}><option value="open">임시 용도 열기</option>{current?.status==='open'&&current.residentId===residentId&&current.operatorAccount===accountId?<option value="closed">이번 회차 종료 기록</option>:null}</select></label>
 {input.references.map((r,i)=><fieldset key={i}><legend>읽는 순서 {i+1}</legend>
 <label>연결 자료 {i+1}<select id={'space-reference-'+buildingId+'-'+i} required value={r.sourceId?sourceKey(r):''} disabled={busy||Boolean(preview)} onChange={e=>{if(e.target.value)setReplacement({index:i,key:e.target.value})}}><option value="">원자료 선택</option>{sourceList.map(s=><option key={s.key} value={s.key}>{s.kind==='material'?'재료':'원글·결과물'} · {s.title}</option>)}</select></label>
 <label>이 공간에서의 자료 구분<select value={r.role} disabled={busy||Boolean(preview)} onChange={e=>changeRef(i,{role:e.target.value as SpaceReference['role']})}><option value="source">원자료</option><option value="derived">파생안</option></select></label>
 <label>조건의 이름<select value={r.conditionKind} disabled={busy||Boolean(preview)} onChange={e=>changeRef(i,{conditionKind:e.target.value as SpaceReference['conditionKind']})}>{Object.entries(conditionNames).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
 <label>핵심 조건 한 줄<input required maxLength={300} value={r.condition} disabled={busy||Boolean(preview)} onChange={e=>changeRef(i,{condition:e.target.value})}/></label>
 {input.layout==='free'?<><label>가로 위치 {r.x}<input type="range" min="0" max="100" value={r.x} disabled={busy||Boolean(preview)} onChange={e=>changeRef(i,{x:Number(e.target.value)})}/></label><label>세로 위치 {r.y}<input type="range" min="0" max="100" value={r.y} disabled={busy||Boolean(preview)} onChange={e=>changeRef(i,{y:Number(e.target.value)})}/></label></>:null}
 <div className="space-actions"><button type="button" disabled={busy||Boolean(preview)||i===0} onClick={()=>setInput(v=>{const references=[...v.references];[references[i-1],references[i]]=[references[i],references[i-1]];return {...v,references}})}>자료 {i+1} 먼저 읽기</button><button type="button" disabled={busy||Boolean(preview)||input.references.length<=2} onClick={()=>setInput(v=>({...v,references:v.references.filter((_,j)=>j!==i)}))}>자료 {i+1} 제외</button></div>
 </fieldset>)}
 {replacement&&newSource?<div className="space-preview" role="group" aria-label="자료 교체 검토"><h4>내 공간의 참조 교체 검토</h4><p>현재 자료: {beforeReplacement?.title??'아직 선택하지 않음'}</p><p>현재 조건: {input.references[replacement.index].condition||'아직 작성하지 않음'}</p><p>바꿀 자료: {newSource.title}</p><p>원자료 조건: {newSource.conditions}</p><p>바뀌는 조건: 새 원자료 조건을 가져옵니다. 이후 핵심 조건 한 줄을 직접 확인해 주세요.</p><button type="button" onClick={()=>{changeRef(replacement.index,{kind:newSource.kind,sourceId:newSource.id,role:newSource.status.includes('파생')?'derived':'source',condition:newSource.conditions.slice(0,300)});cancelReplacement()}}>내 공간의 참조로 선택</button><button type="button" onClick={cancelReplacement}>자료 교체 취소</button></div>:null}
 <div className="space-actions"><button type="button" disabled={busy||Boolean(preview)||input.references.length>=6} onClick={()=>setInput(v=>({...v,references:[...v.references,{...freshRef(),x:(v.references.length%3)*35,y:Math.floor(v.references.length/3)*55}]}))}>연결 자료 추가 · 최대 6개</button><button type="submit" disabled={!writable||Boolean(preview)||Boolean(replacement)}>공개 전 영향 미리보기</button><button type="button" disabled={busy} onClick={()=>editor.close(close)}>공간 편집 닫기</button></div>
 </form>:null}
 {error?<p role="alert">{error}</p>:null}
 {preview&&influence?<div className="space-preview" role="region" aria-label="공개 전 영향 미리보기"><h3>공개 전, 달라지는 것</h3><dl><dt>기존 용도</dt><dd>{current?.purpose??'공개판 없음'}</dd><dt>변경 용도</dt><dd>{preview.purpose}</dd><dt>추가 연결</dt><dd>{influence.added.join(' · ')||'없음'}</dd><dt>제외 연결</dt><dd>{influence.removed.join(' · ')||'없음'}</dd><dt>유지 연결</dt><dd>{influence.retained.join(' · ')||'없음'}</dd><dt>계속 열리는 원문</dt><dd>제외한 참조도 이전 판에서 계속 열립니다. 원문 자체는 이동·복제·수정하지 않습니다.</dd><dt>참여·담당</dt><dd>공개와 방문만으로 동의나 담당을 만들지 않습니다. 답하지 않고 쉬거나 계속 읽을 수 있습니다.</dd></dl><h4>{preview.title}</h4><p>{preview.question}</p><p>종료 범위: {preview.endScope}</p><SpaceReading version={preview} sources={sourceList} profiles={profiles} onOpen={onOpen}/>{preview.parentId!==state.currentId?<p role="alert">다른 공개판이 도착했습니다. 이 미리보기로 덮어쓸 수 없습니다. 닫은 뒤 최신 판을 확인해 주세요.</p>:null}
 <div className="space-actions"><button type="button" disabled={!writable||preview.parentId!==state.currentId} onClick={async()=>{const ok=await editor.save(()=>perform(()=>publishSpace(accountId,buildingId,preview,sourceList),'공간을 새 판으로 공개했습니다. 이전 판과 원자료는 보존됩니다.'));if(ok){close();setHistoryId('');editor.saved(preview);setTimeout(()=>launch.current?.focus(),0)}}}>영향 확인 후 새 판 공개</button><button type="button" disabled={busy} onClick={()=>{setPreview(null);setTimeout(()=>previewLaunch.current?.focus(),0)}}>공개 취소 · 계속 편집</button></div></div>:null}
 {editing||editor.phase!=='idle'?<CityEditorFeedback editor={editor} name="공간 편집"/>:null}
 </section>
}
