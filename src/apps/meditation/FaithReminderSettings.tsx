import {useEffect,useState} from 'react'
import {ALL_REMINDER_DAYS,REMINDER_DAY_LABELS,reminderDaysLabel,validReminderTime,type DevotionReminder} from './devotionReminderModel'
import {activateDevotionReminders,currentNotificationPermission,REMINDER_PERMISSION_EVENT,useDevotionReminders} from './useDevotionReminders'
import {enrollReminderPush} from './reminderPush'
import './FaithNotifications.css'
export function FaithReminderSettings({uid}:{uid:string}){
 const model=useDevotionReminders(uid),[permission,setPermission]=useState(currentNotificationPermission),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[background,setBackground]=useState(false)
 const [editing,setEditing]=useState(''),[time,setTime]=useState('07:00'),[days,setDays]=useState<number[]>([...ALL_REMINDER_DAYS])
 useEffect(()=>{let alive=true;setBackground(false);const refresh=()=>setPermission(currentNotificationPermission());window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);window.addEventListener(REMINDER_PERMISSION_EVENT,refresh);if(uid&&currentNotificationPermission()==='granted')void enrollReminderPush(uid).then(value=>{if(alive)setBackground(value)});return()=>{alive=false;document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);window.removeEventListener(REMINDER_PERMISSION_EVENT,refresh)}},[uid])
 async function permissionAndActivate(){
  if(typeof Notification==='undefined'||typeof Notification.requestPermission!=='function')throw Error('이 브라우저에서는 기기 알림을 지원하지 않습니다.')
  const result=await Notification.requestPermission();setPermission(result)
  if(result!=='granted')throw Error('기기 알림을 허용해주세요. 차단한 경우 브라우저 설정에서 변경할 수 있어요.')
  if(uid)await activateDevotionReminders(uid,true)
  window.dispatchEvent(new Event(REMINDER_PERMISSION_EVENT));void enrollReminderPush(uid).then(setBackground)
 }
 async function action(task:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setMessage('');try{await task()}catch(e){setError(e instanceof Error&&/[가-힣]/.test(e.message)?e.message:'설정을 저장하지 못했습니다. 연결을 확인하고 다시 시도해주세요.')}finally{setBusy(false)}}
 function edit(row?:DevotionReminder){setEditing(row?.id||'new');setTime(row?.time||'07:00');setDays(row?[...row.days]:[...ALL_REMINDER_DAYS]);setError('')}
 async function save(){
  if(!validReminderTime(time)||!days.length)throw Error('시간과 알림을 받을 요일을 선택해주세요.')
  const id=editing==='new'?(globalThis.crypto?.randomUUID?.()||'alarm-'+Date.now().toString(36)):editing,timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul'
  await model.change(value=>{if(editing==='new'&&value.reminders.length>=20)throw Error('묵상 알림은 최대 20개까지 등록할 수 있어요.');const old=value.reminders.find(row=>row.id===id);return{...value,enabled:editing==='new'&&permission==='granted'?true:value.enabled,reminders:[...value.reminders.filter(row=>row.id!==id),{id,time,days,timezone,enabled:old?.enabled??true}]}})
  setEditing('');setMessage('알림을 저장했어요.')
 }
 const active=model.value.enabled&&permission==='granted'
 return <section className="faith-reminder-settings" aria-label="묵상 시간 알림"><div><span><strong>묵상 시간 알림</strong><small>내가 정한 요일과 시간에</small></span><button type="button" role="switch" aria-label="묵상 시간 알림" aria-checked={active} disabled={!uid||!model.loaded||busy} onClick={()=>void action(async()=>{if(active)await model.change(value=>({...value,enabled:false}));else if(permission!=='granted')await permissionAndActivate();else await activateDevotionReminders(uid,true)})}><span/></button></div>
 <small>{background?'이 기기에서 푸시 알림을 받을 수 있어요.':'앱을 켜 둔 동안 알림이 울려요. 앱을 완전히 닫은 뒤 받는 푸시는 아직 준비 중이에요.'}</small>
 {permission!=='granted'&&<button type="button" className="faith-connection-link" disabled={busy} onClick={()=>void action(permissionAndActivate)}>알림 권한 허용</button>}
 <div className="faith-reminder-list">{model.value.reminders.map(row=><article className="faith-reminder-row" key={row.id}><button className="faith-reminder-edit" type="button" aria-label={row.time+' '+reminderDaysLabel(row.days)+' 알림 수정'} disabled={busy} onClick={()=>edit(row)}><strong>{row.time}</strong><small>{reminderDaysLabel(row.days)}</small></button><button type="button" role="switch" aria-label={row.time+' 알림'} aria-checked={row.enabled} disabled={busy} onClick={()=>void action(()=>model.change(value=>({...value,reminders:value.reminders.map(item=>item.id===row.id?{...item,enabled:!item.enabled}:item)})))}><span/></button><button className="faith-reminder-delete" type="button" aria-label={row.time+' 알림 삭제'} disabled={busy} onClick={()=>void action(()=>model.change(value=>{const reminders=value.reminders.filter(item=>item.id!==row.id);return{...value,reminders,enabled:reminders.length?value.enabled:false}}))}>삭제</button></article>)}</div>
 {!editing&&<button type="button" className="faith-connection-link" disabled={!uid||!model.loaded||busy||model.value.reminders.length>=20} onClick={()=>edit()}>＋ 알림 추가</button>}
 {editing&&<form className="faith-reminder-editor" aria-label="묵상 알림 편집" onSubmit={event=>{event.preventDefault();void action(save)}}><label>시간<input type="time" aria-label="묵상 알림 시간" value={time} disabled={busy} onChange={event=>setTime(event.target.value)}/></label><div className="faith-reminder-days" role="group" aria-label="알림 요일"><button type="button" aria-pressed={days.length===7} disabled={busy} onClick={()=>setDays([...ALL_REMINDER_DAYS])}>매일</button>{ALL_REMINDER_DAYS.map(day=><button key={day} type="button" aria-label={REMINDER_DAY_LABELS[day]+'요일'} aria-pressed={days.includes(day)} disabled={busy} onClick={()=>setDays(value=>value.includes(day)?value.filter(item=>item!==day):[...value,day])}>{REMINDER_DAY_LABELS[day]}</button>)}</div><div className="faith-reminder-editor-actions"><button type="button" className="faith-connection-link" disabled={busy} onClick={()=>setEditing('')}>취소</button><button type="submit" className="faith-connection-link" disabled={busy||!days.length||!validReminderTime(time)}>알림 저장</button></div></form>}
 {!uid&&<p>로그인 후 알림을 설정해주세요.</p>}{busy&&<p role="status">설정을 저장하고 있어요…</p>}{message&&<p role="status">{message}</p>}{(error||model.error)&&<p role="alert">{error||model.error}</p>}</section>
}
