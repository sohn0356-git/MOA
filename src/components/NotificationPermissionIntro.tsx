import {useState} from 'react'
import {Bell} from 'lucide-react'
import {SanctuaryDialog} from '../apps/meditation/SanctuaryDialog'
import './NotificationPermissionIntro.css'
export const NOTIFICATION_PERMISSION_INTRO_KEY='moa.notification-intro.v1'
export function needsNotificationPermissionIntro(){
 if(typeof window==='undefined'||typeof Notification==='undefined'||typeof Notification.requestPermission!=='function'||Notification.permission!=='default')return false
 try{if(localStorage.getItem(NOTIFICATION_PERMISSION_INTRO_KEY)==='1')return false}catch{/* Fall back to this tab's storage. */}
 try{if(sessionStorage.getItem(NOTIFICATION_PERMISSION_INTRO_KEY)==='1')return false}catch{/* Permission can still be requested without storage. */}
 return true
}
function remember(){
 try{localStorage.setItem(NOTIFICATION_PERMISSION_INTRO_KEY,'1')}catch{try{sessionStorage.setItem(NOTIFICATION_PERMISSION_INTRO_KEY,'1')}catch{/* Dismissing still closes this instance. */}}
}
export function NotificationPermissionIntro({ready}:{ready:boolean}){
 const [open,setOpen]=useState(needsNotificationPermissionIntro),[busy,setBusy]=useState(false),[error,setError]=useState('')
 function dismiss(){if(busy)return;remember();setOpen(false)}
 async function allow(){
  if(busy)return
  setBusy(true);setError('')
  try{await Notification.requestPermission();remember();setOpen(false)}catch{setError('알림 권한 창을 열지 못했습니다. 브라우저 설정에서 알림을 허용해주세요.')}finally{setBusy(false)}
 }
 if(!ready||!open||typeof Notification==='undefined'||Notification.permission!=='default')return null
 return <SanctuaryDialog open title="모아 알림을 허용할까요?" className="moa-notification-intro" onClose={dismiss}><span className="moa-notification-intro-icon" aria-hidden="true"><Bell size={28}/></span><p>이 기기에서 소식과 묵상 알림을 받기 위한<br/>알림 권한을 먼저 준비해요.</p><small>묵상 시간 알림은 내 기록 → 설정에서 따로 관리해요.</small>{error&&<p role="alert">{error}</p>}<div className="moa-notification-intro-actions"><button type="button" disabled={busy} onClick={dismiss}>나중에</button><button type="button" disabled={busy} onClick={()=>void allow()}>{busy?'확인 중…':'알림 허용'}</button></div></SanctuaryDialog>
}
