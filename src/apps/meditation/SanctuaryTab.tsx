import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { BookOpen, HandHeart, Flame, Sunrise, Sun, Moon, Volume2, LockKeyhole, ArrowUpRight, Play, Pause, RotateCcw } from 'lucide-react'
import { BEFORE_APP_UPDATE } from '../../lib/appUpdateProtocol'
import { SanctuaryScene, sanctuarySeats } from './SanctuaryScene'
import { normalizeSanctuaryRecord, sanctuaryDay, sanctuaryKey, type SanctuaryMember, type SanctuaryRecord } from './sanctuaryState'
import './SanctuaryTab.css'
type Props = { member:SanctuaryMember|null; authBusy?:boolean; onSignIn?:()=>Promise<unknown>; onRead:()=>void; onPrayer:()=>void; scripture:{reference:string;text:string} }
export function SanctuaryTab(props: Props) {
 const [signing,setSigning]=useState(false),[error,setError]=useState('')
 if(props.member) return <SanctuaryExperience key={props.member.uid} {...props} member={props.member}/>
 async function signIn() {
  if(!props.onSignIn || signing || props.authBusy)return
  setSigning(true);setError('')
  try{await props.onSignIn()}catch{setError('로그인을 완료하지 못했습니다. 다시 시도해주세요.')}finally{setSigning(false)}
 }
 return <section className="sanctuary sanctuary-gate" aria-label="예배당 로그인 안내" data-light="dawn">
  <div className="sanctuary-eyebrow"><span/>MOA FAITH · SANCTUARY</div>
  <h2>마음이 쉬어가는<br/><em>나의 예배당</em></h2>
  <p className="sanctuary-lead">분주한 하루에서 한 걸음 물러나,<br/>말씀과 기도에 머무는 시간을 가져보세요.</p>
  <div className="sanctuary-gate-scene"><SanctuaryScene seat={0}/><span className="sanctuary-gate-seal"><LockKeyhole size={22}/></span></div>
  <div className="sanctuary-login-card">
   <h3>로그인하고 들어오세요</h3><p>예배당은 로그인한 계정으로 이용할 수 있습니다.<br/>활동 아이디 선택과 별도로 계정 로그인이 필요해요.</p>
   {props.onSignIn ? <button className="sanctuary-primary" type="button" disabled={signing||props.authBusy} onClick={()=>void signIn()}>{signing?'로그인 중…':'로그인하고 예배당 입장'}<ArrowUpRight size={17}/></button> : <a className="sanctuary-primary" href="#/login">로그인하고 예배당 입장<ArrowUpRight size={17}/></a>}
   {error&&<p role="alert">{error}</p>}
  </div>
 </section>
}
function SanctuaryExperience({member,onRead,onPrayer,scripture}:Props & {member:SanctuaryMember}) {
 const storageKey=sanctuaryKey(member.uid)
 const [loadError]=useState(()=>{try{JSON.parse(localStorage.getItem(storageKey)||'null');return ''}catch{return '예배당 기록을 읽지 못했습니다. 이 기기의 저장 설정을 확인해주세요.'}})
 const [record,setRecord]=useState<SanctuaryRecord>(()=>{try{return normalizeSanctuaryRecord(JSON.parse(localStorage.getItem(storageKey)||'null'))}catch{return normalizeSanctuaryRecord(null)}})
 const latest=useRef(record);latest.current=record
 const [error,setError]=useState(loadError),[savedAt,setSavedAt]=useState<number|null>(null)
 const unsaved=useRef(false),audio=useRef<AudioContext|null>(null),mounted=useRef(true)
 const [notice,setNotice]=useState(''),[minutes,setMinutes]=useState(5),[remaining,setRemaining]=useState(300),[running,setRunning]=useState(false)
 const deadline=useRef<number|null>(null),finished=useRef(false)
 const save=useCallback((patch:Partial<SanctuaryRecord>)=>{
  const next={...latest.current,...patch};latest.current=next;setRecord(next)
  try{localStorage.setItem(storageKey,JSON.stringify(next));unsaved.current=false;setSavedAt(Date.now());setError('')}
  catch{unsaved.current=true;setSavedAt(null);setError('예배당 기록을 임시저장하지 못했습니다. 저장 공간을 확인하고 메모를 복사해두세요.')}
 },[storageKey])
 useEffect(()=>{
  mounted.current=true
  const guard=(event:Event)=>{if(unsaved.current){event.preventDefault();setError('저장되지 않은 예배당 메모가 있습니다. 저장 공간을 확인해주세요.')}}
  const unload=(event:BeforeUnloadEvent)=>{if(unsaved.current){event.preventDefault();event.returnValue=''}}
  window.addEventListener(BEFORE_APP_UPDATE,guard);window.addEventListener('moa:before-navigation',guard);window.addEventListener('beforeunload',unload)
  return()=>{mounted.current=false;void audio.current?.close().catch(()=>{});window.removeEventListener(BEFORE_APP_UPDATE,guard);window.removeEventListener('moa:before-navigation',guard);window.removeEventListener('beforeunload',unload)}
 },[])
 const complete=useCallback(()=>{
  if(finished.current)return
  finished.current=true;deadline.current=null;setRunning(false);setRemaining(0);save({sessions:latest.current.sessions+1});setNotice('기도 시간을 마쳤습니다. 오늘의 평안이 하루에 이어지기를 바라요.')
 },[save])
 useEffect(()=>{
  if(!running)return
  const tick=()=>{if(deadline.current===null)return;const left=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setRemaining(left);if(left===0)complete()}
  tick();const id=window.setInterval(tick,500);return()=>window.clearInterval(id)
 },[running,complete])
 function toggleTimer(){
  setNotice('')
  if(running){const left=Math.max(0,Math.ceil(((deadline.current||Date.now())-Date.now())/1000));if(left===0){complete();return}setRemaining(left);deadline.current=null;setRunning(false)}
  else{const duration=remaining>0?remaining:minutes*60;finished.current=false;setRemaining(duration);deadline.current=Date.now()+duration*1000;setRunning(true)}
 }
 async function ring(){
  try{
   if(!window.AudioContext)throw new Error('unsupported')
   if(!audio.current||audio.current.state==='closed')audio.current=new AudioContext()
   const context=audio.current;await context.resume();if(!mounted.current)return
   for(const [index,frequency] of [523.25,1046.5,1569.75].entries()){
    const tone=context.createOscillator(),gain=context.createGain();tone.type='sine';tone.frequency.value=frequency
    const start=context.currentTime+index*.035;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.045/(index+1),start+.02);gain.gain.exponentialRampToValueAtTime(.0001,start+3.5)
    tone.connect(gain);gain.connect(context.destination);tone.start(start);tone.stop(start+3.6)
   }
   setNotice('작은 종소리를 울렸습니다.')
  }catch{if(mounted.current)setError('이 브라우저에서는 종소리를 재생하지 못했습니다. 소리 설정을 확인해주세요.')}
 }
 const today=sanctuaryDay(),candles=record.candleDay===today?record.candles:0
 const clock=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0')
 const progress=1-remaining/(minutes*60)
 return <section className="sanctuary" data-light={record.light} aria-label="나의 예배당">
  <div className="sanctuary-welcome"><div><span className="sanctuary-eyebrow"><span/>YOUR QUIET PLACE</span><h2>{member.displayName||'방문자'}님,<br/><em>잠시 쉬어가세요.</em></h2></div><span className="sanctuary-open-badge">나의 예배당</span></div>
  <p className="sanctuary-lead">말씀을 가까이, 마음은 가볍게.<br/>오늘의 속도를 잠시 내려놓는 곳.</p>
  <div className="sanctuary-room-card">
   <div className="sanctuary-room-top"><span>01 <i/> 고요한 본당</span><button type="button" onClick={()=>void ring()} aria-label="예배당 종소리 듣기"><Volume2 size={16}/>종소리</button></div>
   <SanctuaryScene seat={record.seat} onSeat={seat=>save({seat})} candle={candles>0}/>
   <div className="sanctuary-room-bottom"><span><span className="sanctuary-dot"/>{sanctuarySeats[record.seat]}에 앉아 있어요</span><small>동그란 자리를 눌러 이동</small></div>
  </div>
  <div className="sanctuary-light-switch" role="group" aria-label="예배당 빛 분위기">
   {([{id:'dawn',label:'새벽',Icon:Sunrise},{id:'day',label:'낮',Icon:Sun},{id:'evening',label:'저녁',Icon:Moon}] as const).map(({id,label,Icon})=><button key={id} type="button" aria-pressed={record.light===id} onClick={()=>save({light:id})}><Icon size={16}/>{label}</button>)}
  </div>
  <section className="sanctuary-verse-card" aria-label="마음에 두는 말씀"><span className="sanctuary-eyebrow">A WORD TO REST IN</span><p>{scripture.text||'말씀을 불러오는 동안 조용히 마음을 준비해보세요.'}</p><div><span>{scripture.reference}</span><button type="button" onClick={onRead}>말씀 읽기<ArrowUpRight size={15}/></button></div></section>
  <div className="sanctuary-practices">
   <section className="sanctuary-timer-card" aria-label="고요한 기도 시간">
    <div className="sanctuary-card-head"><span>고요한 기도</span><HandHeart size={19}/></div>
    <div className="sanctuary-timer-face" data-running={running} style={{'--prayer-progress':progress} as CSSProperties}><span role="timer" aria-label="기도 남은 시간">{clock}</span><small>{running?'잠시, 기도에 머물러요':remaining===0?'평안이 함께하기를':'나만의 조용한 시간'}</small></div>
    <div className="sanctuary-duration" role="group" aria-label="기도 시간 선택">{[5,10,20].map(value=><button key={value} type="button" disabled={running} aria-pressed={minutes===value} onClick={()=>{setMinutes(value);setRemaining(value*60);finished.current=false;setNotice('')}}>{value}분</button>)}</div>
    <div className="sanctuary-timer-actions"><button type="button" className="sanctuary-primary" onClick={toggleTimer}>{running?<Pause size={16}/>:<Play size={16}/>} {running?'잠시 멈춤':'기도 시작'}</button><button type="button" className="sanctuary-reset" aria-label="기도 타이머 초기화" onClick={()=>{deadline.current=null;finished.current=false;setRunning(false);setRemaining(minutes*60);setNotice('')}}><RotateCcw size={17}/></button></div>
   </section>
   <section className="sanctuary-candle-card" aria-label="마음의 촛불"><div className="sanctuary-card-head"><span>마음의 촛불</span><Flame size={19}/></div><div className="sanctuary-candle" data-lit={candles>0}><div className="sanctuary-flame"/><div className="sanctuary-wick"/><div className="sanctuary-wax"/></div><p>마음에 떠오르는 이를 위해<br/>작은 빛을 남겨보세요.</p><button className="sanctuary-candle-button" type="button" onClick={()=>{save({candleDay:today,candles:candles+1});setNotice('마음의 촛불을 켰습니다.')}}><Flame size={15}/>촛불 켜기</button><small>오늘 내가 켠 촛불 <strong>{candles}</strong></small></section>
  </div>
  <section className="sanctuary-note-card" aria-label="나의 기도 메모"><div className="sanctuary-card-head"><div><span>마음에 남은 한 줄</span><small>기도 중 떠오른 마음을 남겨보세요.</small></div><BookOpen size={20}/></div><textarea aria-label="예배당 개인 기도 메모" value={record.note} maxLength={4000} rows={4} placeholder="오늘, 제 마음은…" onChange={event=>save({note:event.target.value})}/><div className="sanctuary-note-footer"><small>이 계정의 메모는 이 기기에만 보관됩니다.</small><span role="status">{savedAt?'자동 저장됨':''}</span></div><button className="sanctuary-prayer-link" type="button" onClick={onPrayer}>함께 나눌 기도 작성하기<ArrowUpRight size={16}/></button></section>
  {notice&&<p className="sanctuary-notice" role="status">{notice}</p>}
  {error&&<p className="sanctuary-error" role="alert">{error}</p>}
  <footer className="sanctuary-footer"><span>MOA FAITH</span><p>오늘도, 마음에 평안이 머물기를.</p><small>이 기기에서 마친 기도 {record.sessions}회</small></footer>
 </section>
}
