import {useEffect,useRef,useState} from 'react'
import {changeCityImplementation,subscribeCityImplementationEvents,type CityPost,type CityImplementation,type CityImplementationEvent} from './cityService'
import {suggestionTitle} from './cityPresentation'
type Perform=(action:()=>Promise<void>,message:string)=>Promise<boolean>
export function CityImplementationPanel({post,accountId,busy,perform}:{post:CityPost;accountId:string;busy:boolean;perform:Perform}){
 const [editing,setEditing]=useState(false),[nextApplied,setNextApplied]=useState(false),[note,setNote]=useState('')
 const [previous,setPrevious]=useState<CityImplementation|undefined>()
 const [events,setEvents]=useState<CityImplementationEvent[]>([]),[failed,setFailed]=useState(false)
 const [undo,setUndo]=useState<{id:string;previousApplied:boolean}|null>(null)
 const [result,setResult]=useState(''),[error,setError]=useState('')
 const locked=useRef(false),trigger=useRef<HTMLInputElement>(null),panel=useRef<HTMLDivElement>(null)
 useEffect(()=>{try{return subscribeCityImplementationEvents(post.id,setEvents,()=>setFailed(true))}catch{setFailed(true)}},[post.id])
 useEffect(()=>{if(editing)panel.current?.focus()},[editing])
 useEffect(()=>{const latest=events.find(event=>event.id===post.implementation?.eventId);if(!undo&&latest?.action==='change'){setUndo({id:latest.id,previousApplied:latest.previousApplied});setResult('최근 상태 변경을 되돌릴 수 있습니다.')}},[events,post.implementation?.eventId])
 function begin(applied:boolean){setPrevious(post.implementation);setNextApplied(applied);setNote('');setError('');setEditing(true)}
 function cancel(){setEditing(false);trigger.current?.focus()}
 async function save(){
  if(locked.current||busy||!note.trim())return
  locked.current=true;setError('')
  let id=''
  const saved=await perform(async()=>{id=await changeCityImplementation(accountId,post.id,nextApplied,note,previous)},'건의 상태 변경을 저장했습니다.')
  locked.current=false
  if(saved){setUndo({id,previousApplied:Boolean(previous?.applied)});setResult(nextApplied?'완료로 변경됨':'미반영으로 변경됨');cancel()}else setError('상태를 저장하지 못했습니다. 최신 상태를 확인하고 다시 시도해 주세요.')
 }
 async function undoChange(){
  if(!undo||locked.current||busy)return
  locked.current=true;setError('')
  const saved=await perform(async()=>{await changeCityImplementation(accountId,post.id,undo.previousApplied,'직전 상태 변경 실행 취소',undefined,undo.id)},'직전 변경을 되돌림 기록으로 남겼습니다.')
  locked.current=false
  if(saved){setUndo(null);setResult('실행 취소됨 · 이전 상태로 복원했습니다.')}else setError('실행 취소하지 못했습니다. 다른 변경이 있었는지 확인해 주세요.')
 }
 return <section className={'city-implementation '+(post.implementation?.applied?'is-applied':'')} aria-label="반영 근거"><h4>반영 상태와 확인 근거</h4><label><input ref={trigger} type="checkbox" checked={Boolean(post.implementation?.applied)} disabled={busy} onChange={event=>begin(event.target.checked)}/>반영 완료</label><span>{post.implementation?.applied?'반영 완료':'미반영'}</span>{post.implementation?<p>{post.implementation.note} · {post.implementation.reviewerAccount} · {new Date(post.implementation.reviewedAt).toLocaleString('ko-KR')}</p>:<p>아직 반영 여부를 확인하지 않은 건의입니다.</p>}
 {editing?<div ref={panel} tabIndex={-1} className="city-status-confirm" aria-label="건의 상태 변경 확인"><h5>{suggestionTitle(post)}</h5><p>기존: {previous?.applied?'반영 완료':'미반영'} → 변경: {nextApplied?'반영 완료':'미반영'}</p><label>짧은 확인 근거<textarea required maxLength={1000} disabled={busy} value={note} onChange={event=>setNote(event.target.value)}/></label><button type="button" disabled={busy||!note.trim()} onClick={()=>void save()}>상태 변경 저장</button><button type="button" disabled={busy} onClick={cancel}>상태 변경 취소</button></div>:null}
 {result?<div role="status">{result}{undo?<button type="button" disabled={busy} onClick={()=>void undoChange()}>상태 변경 실행 취소</button>:null}</div>:null}{error?<p role="alert">{error}</p>:null}
 <details><summary>상태 변경 이력 ({events.length})</summary>{events.map(event=><article key={event.id}><p>{event.action==='undo'?'되돌림':'상태 변경'} · {event.previousApplied?'완료':'미반영'} → {event.applied?'완료':'미반영'}</p><p>{event.note} · {event.reviewerAccount} · {new Date(event.reviewedAt).toLocaleString('ko-KR')}</p></article>)}{failed?<p role="alert">상태 이력을 불러오지 못했습니다.</p>:null}</details></section>
}
