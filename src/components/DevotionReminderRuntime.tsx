import {useEffect,useRef} from 'react'
import {activateDevotionReminders,currentNotificationPermission,REMINDER_PERMISSION_EVENT,useDevotionReminders} from '../apps/meditation/useDevotionReminders'
import {dueReminderKey} from '../apps/meditation/devotionReminderModel'
import {enrollReminderPush} from '../apps/meditation/reminderPush'
export async function showDevotionReminder(tag:string){
 const options={body:'잠시 마음을 가다듬고 오늘의 말씀을 묵상해보세요.',tag,icon:'/MOA/icons/chapel-v1-192.png',data:{url:'/MOA/'}}
 const registration='serviceWorker'in navigator?await navigator.serviceWorker.getRegistration('/MOA/'):undefined
 if(registration)await registration.showNotification('묵상할 시간이에요',options)
 else new Notification('묵상할 시간이에요',options)
}
export function DevotionReminderRuntime({uid}:{uid:string}){
 const model=useDevotionReminders(uid),latest=useRef(model.value),tickRef=useRef<()=>void>(()=>{});latest.current=model.value
 useEffect(()=>{
  if(!uid)return
  let alive=true,remote=false
  const activate=(explicit:boolean)=>{if(currentNotificationPermission()!=='granted')return;void activateDevotionReminders(uid,explicit).catch(()=>{});void enrollReminderPush(uid).then(value=>{if(alive)remote=value})}
  activate(false)
  const granted=()=>activate(true)
  window.addEventListener(REMINDER_PERMISSION_EVENT,granted)
  const inFlight=new Set<string>(),firedInMemory=new Set<string>()
  async function deliver(key:string){
   if(inFlight.has(key))return;inFlight.add(key)
   const work=async()=>{
    if(!alive||firedInMemory.has(key)||currentNotificationPermission()!=='granted')return
    const storageKey='moa.reminder.fired.v2:'+uid+':'+key
    try{if(localStorage.getItem(storageKey))return;localStorage.setItem(storageKey,'1')}catch{/* Keep a session claim when browser storage is unavailable. */}
    firedInMemory.add(key)
    try{await showDevotionReminder('moa-devotion:'+uid+':'+key.slice(0,-6))}catch{firedInMemory.delete(key);try{localStorage.removeItem(storageKey)}catch{}}
   }
   try{if(navigator.locks)await navigator.locks.request('moa-reminder:'+uid+':'+key,work);else await work()}catch{await work()}finally{inFlight.delete(key)}
  }
  const tick=()=>{if(!alive||remote||!latest.current.enabled||currentNotificationPermission()!=='granted')return;const now=new Date();for(const reminder of latest.current.reminders){const key=dueReminderKey(reminder,now);if(key)void deliver(key)}}
  tickRef.current=tick
  const timer=window.setInterval(tick,1000);document.addEventListener('visibilitychange',tick);window.addEventListener('focus',tick)
  return()=>{alive=false;tickRef.current=()=>{};window.clearInterval(timer);window.removeEventListener(REMINDER_PERMISSION_EVENT,granted);document.removeEventListener('visibilitychange',tick);window.removeEventListener('focus',tick)}
 },[uid])
 useEffect(()=>{tickRef.current()},[model.value])
 return null
}
