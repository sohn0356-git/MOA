import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Flame, Sunrise, Sun, Moon, LockKeyhole, ArrowUpRight, Play, Pause, RotateCcw } from 'lucide-react'
import { BEFORE_APP_UPDATE } from '../../lib/appUpdateProtocol'
import { SanctuaryScene } from './SanctuaryScene'
import { normalizeSanctuaryRecord, sanctuaryDay, sanctuaryKey, type SanctuaryMember, type SanctuaryRecord } from './sanctuaryState'
import './SanctuaryTab.css'
import './SanctuaryCommunity.css'
import './SanctuaryCompact.css'
import {useSanctuaryCommunity} from './useSanctuaryCommunity'
import {useChapelEntrance} from './useChapelEntrance'
import {SanctuaryMusic} from './SanctuaryMusic'
import {SanctuaryCommunityPanel} from './SanctuaryCommunityPanel'
type Props = { chapelNotifications?:boolean; member:SanctuaryMember|null; authBusy?:boolean; onSignIn?:()=>Promise<unknown>; onRead:()=>void; onPrayer:()=>void; scripture:{reference:string;text:string} }
export function SanctuaryTab(props: Props) {
 const [signing,setSigning]=useState(false),[error,setError]=useState('')
 if(props.authBusy && !props.member) return <section className="sanctuary sanctuary-session-restore" role="status"><LockKeyhole size={24}/><h3>로그인 상태를 복원하고 있습니다</h3><p>저장된 계정을 확인하는 동안 잠시만 기다려주세요.</p></section>
 if(props.member) return <SanctuaryExperience key={props.member.uid} {...props} member={props.member}/>
 async function signIn() {
  if(!props.onSignIn || signing || props.authBusy)return
  setSigning(true);setError('')
  try{await props.onSignIn()}catch{setError('로그인을 완료하지 못했습니다. 다시 시도해주세요.')}finally{setSigning(false)}
 }
 return <section className="sanctuary sanctuary-gate" aria-label="예배당 로그인 안내" data-light="dawn">
  <div className="sanctuary-eyebrow"><span/>MOA · SANCTUARY</div>
  <h2>마음이 쉬어가는<br/><em>나의 예배당</em></h2>
  <p className="sanctuary-lead">분주한 하루에서 한 걸음 물러나,<br/>말씀과 기도에 머무는 시간을 가져보세요.</p>
  <div className="sanctuary-login-card">
   <h3>로그인하고 들어오세요</h3><p>예배당은 로그인한 계정으로 이용할 수 있습니다.<br/>이메일 또는 구글 계정으로 로그인해 함께 기도해요.</p>
   {props.onSignIn ? <button className="sanctuary-primary" type="button" disabled={signing||props.authBusy} onClick={()=>void signIn()}>{signing?'로그인 중…':'로그인하고 예배당 입장'}<ArrowUpRight size={17}/></button> : <a className="sanctuary-primary" href="#/login">로그인하고 예배당 입장<ArrowUpRight size={17}/></a>}
   {error&&<p role="alert">{error}</p>}
  </div>
 </section>
}
function SanctuaryExperience({member,onRead,onPrayer,scripture,chapelNotifications=true}:Props & {member:SanctuaryMember}) {
 const {entranceRef,entered,entering,enter,leave}=useChapelEntrance()
 const room=useSanctuaryCommunity(member,entered,chapelNotifications)
 const [boardOpen,setBoardOpen]=useState(false)
 const storageKey=sanctuaryKey(member.uid)
 const [loadError]=useState(()=>{try{JSON.parse(localStorage.getItem(storageKey)||'null');return ''}catch{return '예배당 기록을 읽지 못했습니다. 이 기기의 저장 설정을 확인해주세요.'}})
 const [record,setRecord]=useState<SanctuaryRecord>(()=>{try{return normalizeSanctuaryRecord(JSON.parse(localStorage.getItem(storageKey)||'null'))}catch{return normalizeSanctuaryRecord(null)}})
 const latest=useRef(record);latest.current=record
 const [error,setError]=useState(loadError),[savedAt,setSavedAt]=useState<number|null>(null)
 const unsaved=useRef(false)
 const [notice,setNotice]=useState(''),[minutes,setMinutes]=useState(5),[remaining,setRemaining]=useState(300),[running,setRunning]=useState(false)
 const deadline=useRef<number|null>(null),finished=useRef(false)
 const save=useCallback((patch:Partial<SanctuaryRecord>)=>{
  const next={...latest.current,...patch};latest.current=next;setRecord(next)
  try{localStorage.setItem(storageKey,JSON.stringify(next));unsaved.current=false;setSavedAt(Date.now());setError('')}
  catch{unsaved.current=true;setSavedAt(null);setError('예배당 기록을 임시저장하지 못했습니다. 저장 공간을 확인하고 메모를 복사해두세요.')}
 },[storageKey])
 useEffect(()=>{
  const guard=(event:Event)=>{if(unsaved.current){event.preventDefault();setError('저장되지 않은 예배당 메모가 있습니다. 저장 공간을 확인해주세요.')}}
  const unload=(event:BeforeUnloadEvent)=>{if(unsaved.current){event.preventDefault();event.returnValue=''}}
  window.addEventListener(BEFORE_APP_UPDATE,guard);window.addEventListener('moa:before-navigation',guard);window.addEventListener('beforeunload',unload)
  return()=>{window.removeEventListener(BEFORE_APP_UPDATE,guard);window.removeEventListener('moa:before-navigation',guard);window.removeEventListener('beforeunload',unload)}
 },[])
 const complete=useCallback(()=>{
  if(finished.current)return
  finished.current=true;deadline.current=null;setRunning(false);setRemaining(0);
  try{navigator.vibrate?.([350,120,350])}catch{/* Device vibration is optional; completion must still be saved. */}
  save({sessions:latest.current.sessions+1});setNotice('기도 시간을 마쳤습니다. 오늘의 평안이 하루에 이어지기를 바라요.')
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
 const today=sanctuaryDay(),candles=record.candleDay===today?record.candles:0
 const clock=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0')
 return <section className="sanctuary sanctuary-compact" ref={entranceRef} inert={entering||undefined} aria-busy={entering} data-entered={entered} data-light={record.light} aria-label="나의 예배당">
  {!entered&&<header className="sanctuary-compact-welcome"><div><small>YOUR QUIET PLACE</small><h2>{member.displayName||'방문자'}님의 작은 예배당</h2></div><span>잠시, 평안히</span></header>}
  <SanctuaryCommunityPanel room={room} uid={member.uid} boardOpen={boardOpen} onBoardClose={()=>setBoardOpen(false)} onEnter={entered?undefined:()=>void enter()}/>
  {entered&&<>
  <div className="sanctuary-room-card">
   <div className="sanctuary-room-top"><span>고요한 본당</span><div className="sanctuary-room-actions"><button type="button" onClick={()=>{leave();setBoardOpen(false)}}>로비로</button><SanctuaryMusic/></div></div>
   <SanctuaryScene profile={room.profile} peers={room.peers} onMotion={room.move} onPrayerBox={()=>setBoardOpen(true)} prayerCount={room.unreadCount} seat={record.seat} onSeat={seat=>save({seat})} candle={candles>0} initialPosition={record.avatarPosition} onPosition={point=>save({avatarPosition:point})}/>
   <div className="sanctuary-room-tools"><div className="sanctuary-light-switch" role="group" aria-label="예배당 빛 분위기">
    {([{id:'dawn',label:'새벽',Icon:Sunrise},{id:'day',label:'낮',Icon:Sun},{id:'evening',label:'저녁',Icon:Moon}] as const).map(({id,label,Icon})=><button key={id} type="button" aria-pressed={record.light===id} onClick={()=>save({light:id})}><Icon size={13}/>{label}</button>)}
   </div><button className="sanctuary-tiny-candle" type="button" aria-label="촛불 켜기" data-lit={candles>0} onClick={()=>{save({candleDay:today,candles:candles+1});setNotice('마음의 촛불을 켰습니다.')}}><Flame size={14}/><span>촛불 {candles}</span></button></div>
  </div>
  {room.error&&<p className="sanctuary-error" role="alert">{room.error}</p>}
  <section className="sanctuary-verse-card" aria-label="마음에 두는 말씀"><p>{scripture.text||'조용히 마음을 준비해보세요.'}</p><div><span>{scripture.reference}</span><button type="button" onClick={onRead}>말씀 읽기<ArrowUpRight size={13}/></button></div></section>
  <section className="sanctuary-timer-card sanctuary-compact-timer" aria-label="고요한 기도 시간"><div className="sanctuary-timer-line"><div><small>고요한 기도</small><strong role="timer" aria-label="기도 남은 시간">{clock}</strong></div><div className="sanctuary-timer-actions"><button type="button" className="sanctuary-primary" onClick={toggleTimer}>{running?<Pause size={14}/>:<Play size={14}/>} {running?'잠시 멈춤':'기도 시작'}</button><button type="button" className="sanctuary-reset" aria-label="기도 타이머 초기화" onClick={()=>{deadline.current=null;finished.current=false;setRunning(false);setRemaining(minutes*60);setNotice('')}}><RotateCcw size={15}/></button></div></div>
   <div className="sanctuary-duration" role="group" aria-label="기도 시간 선택">{[5,10,20].map(value=><button key={value} type="button" disabled={running} aria-pressed={minutes===value} onClick={()=>{setMinutes(value);setRemaining(value*60);finished.current=false;setNotice('')}}>{value}분</button>)}</div>
  </section>
  <details className="sanctuary-private-note"><summary><BookOpen size={15}/>나의 기도 메모<small>이 기기에만 보관</small></summary><div className="sanctuary-note-card"><textarea aria-label="예배당 개인 기도 메모" value={record.note} maxLength={4000} rows={3} placeholder="오늘, 제 마음은…" onChange={event=>save({note:event.target.value})}/><div className="sanctuary-note-footer"><span role="status">{savedAt?'자동 저장됨':''}</span></div><button className="sanctuary-prayer-link" type="button" onClick={onPrayer}>함께 나눌 기도 작성하기<ArrowUpRight size={13}/></button></div></details>
  {notice&&<p className="sanctuary-notice" role="status">{notice}</p>}
  {error&&<p className="sanctuary-error" role="alert">{error}</p>}
  <footer className="sanctuary-footer"><small>MOA · 이 기기에서 마친 기도 {record.sessions}회</small></footer>
  </>}
 </section>
}
