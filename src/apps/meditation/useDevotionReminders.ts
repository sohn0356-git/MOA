import {useEffect,useState} from 'react'
import {onValue,ref,runTransaction,serverTimestamp} from 'firebase/database'
import {getFaithAuth,getFaithDb} from '../../services/faithSession'
import {ALL_REMINDER_DAYS,parseReminderPreferences,serializeReminders,type ReminderPreferences} from './devotionReminderModel'
export const REMINDER_PERMISSION_EVENT='moa:notification-permission-granted'
export function currentNotificationPermission(){return typeof Notification==='undefined'?'unsupported':Notification.permission}
export async function activateDevotionReminders(uid:string,explicit=true){
 if(!uid||getFaithAuth().currentUser?.uid!==uid)return
 const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul'
 await runTransaction(ref(getFaithDb(),'faithReminders/'+uid),raw=>{
  if(getFaithAuth().currentUser?.uid!==uid)return
  if(!explicit&&raw?.version===2)return
  const value=parseReminderPreferences(raw)
  if(!value.reminders.length)value.reminders=[{id:'morning',enabled:true,time:'07:00',timezone,days:[...ALL_REMINDER_DAYS]}]
  return{...serializeReminders({...value,enabled:explicit||raw==null?true:value.enabled}),updatedAt:serverTimestamp()}
 })
}
export function useDevotionReminders(uid:string){
 const [state,setState]=useState<{owner:string;loaded:boolean;value:ReminderPreferences;error:string}>({owner:uid,loaded:!uid,value:{enabled:false,reminders:[]},error:''})
 useEffect(()=>{let alive=true;setState({owner:uid,loaded:!uid,value:{enabled:false,reminders:[]},error:''});if(!uid)return
  let off:()=>void=()=>{}
  try{off=onValue(ref(getFaithDb(),'faithReminders/'+uid),snap=>{if(alive)setState({owner:uid,loaded:true,value:parseReminderPreferences(snap.val()),error:''})},()=>{if(alive)setState(s=>({...s,error:'묵상 알림을 불러오지 못했습니다.'}))})}catch{setState(s=>({...s,error:'묵상 알림에 연결하지 못했습니다.'}))}
  return()=>{alive=false;off()}
 },[uid])
 async function change(modify:(value:ReminderPreferences)=>ReminderPreferences){
  if(!uid||getFaithAuth().currentUser?.uid!==uid)throw Error('로그인 후 설정해주세요.')
  await runTransaction(ref(getFaithDb(),'faithReminders/'+uid),raw=>{if(getFaithAuth().currentUser?.uid!==uid)return;return{...serializeReminders(modify(parseReminderPreferences(raw))),updatedAt:serverTimestamp()}})
 }
 return{...(state.owner===uid?state:{loaded:false,value:{enabled:false,reminders:[]},error:''}),change}
}
