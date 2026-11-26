import {useEffect,useState} from 'react'
import {onValue,ref} from 'firebase/database'
import {getFunctions,httpsCallable} from 'firebase/functions'
import {getFaithAuth,getFaithDb} from '../../services/faithSession'
import './FaithNotifications.css'
type Schedule={enabled:boolean;time:string;timezone:string}
function functionsClient(){return getFunctions(getFaithAuth().app,'us-central1')}
async function subscription(){
 if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw Error('이 브라우저는 푸시 알림을 지원하지 않습니다. iPhone은 홈 화면에 앱을 추가한 뒤 설정해주세요.')
 if(await Notification.requestPermission()!=='granted')throw Error('브라우저 설정에서 알림을 허용해주세요.')
 const registration=await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('앱 준비가 끝난 뒤 다시 시도해주세요.')),12000))])
 const result=await httpsCallable<unknown,{publicKey:string}>(functionsClient(),'faithPushKey')({})
 const old=await registration.pushManager.getSubscription(),key=result.data.publicKey
 const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))
 if(old){const oldKey=old.options.applicationServerKey;if(oldKey&&Array.from(new Uint8Array(oldKey)).join(',')!==Array.from(bytes).join(','))await old.unsubscribe();else return old.toJSON()}
 return (await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes})).toJSON()
}
export function FaithReminderSettings({uid}:{uid:string}){
 const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul'
 const [saved,setSaved]=useState<Schedule>({enabled:false,time:'07:00',timezone}),[time,setTime]=useState('07:00'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[loaded,setLoaded]=useState(!uid),[serverStatus,setServerStatus]=useState<'checking'|'ready'|'unavailable'>('checking')
 useEffect(()=>{let alive=true;setSaved({enabled:false,time:'07:00',timezone});setTime('07:00');setLoaded(!uid);setError('');setMessage('');setServerStatus('checking');if(!uid)return
  void(async()=>{try{const response=await httpsCallable<unknown,{scheduledReady:boolean}>(functionsClient(),'faithPushKey')({});if(alive)setServerStatus(response.data.scheduledReady?'ready':'unavailable')}catch{if(alive)setServerStatus('unavailable')}})()
  const off=onValue(ref(getFaithDb(),'faithReminders/'+uid),snap=>{if(!alive)return;const value=snap.val() as Schedule|null;setSaved(value||{enabled:false,time:'07:00',timezone});setTime(value?.time||'07:00');setLoaded(true)},()=>{if(alive)setError('묵상 알림 설정을 불러오지 못했습니다.')})
  return()=>{alive=false;off()}
 },[uid,timezone])
 async function save(enabled:boolean,deviceOnly=false){
  if(getFaithAuth().currentUser?.uid!==uid)return
  setBusy(true);setError('');setMessage('')
  try{
   const push=enabled||deviceOnly?await subscription():undefined
   if(getFaithAuth().currentUser?.uid!==uid)throw Error('로그인 계정을 다시 확인해주세요.')
   await httpsCallable(functionsClient(),'configureFaithReminder')({enabled:deviceOnly?saved.enabled:enabled,time,timezone,subscription:push})
   setMessage(deviceOnly?'이 기기에서 알림을 받을 수 있어요.':enabled?`매일 ${time}에 묵상 알림을 보내드려요.`:'묵상 시간 알림을 껐어요.')
  }catch(e){const text=e instanceof Error?e.message:'';setError(/[가-힣]/.test(text)?text:'알림 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.')}
  finally{setBusy(false)}
 }
 async function allowDevicePermission(){
  if(serverStatus==='ready'){await save(saved.enabled,true);return}
  setBusy(true);setError('');setMessage('')
  try{
   if(typeof Notification==='undefined'||typeof Notification.requestPermission!=='function')throw Error('이 브라우저에서는 알림 권한을 요청할 수 없습니다.')
   if(await Notification.requestPermission()!=='granted')throw Error('브라우저 설정에서 알림을 허용해주세요.')
   setMessage('이 기기의 알림 권한을 허용했어요.')
  }catch(e){setError(e instanceof Error?e.message:'알림 권한을 확인하지 못했습니다.')}finally{setBusy(false)}
 }
 return <section className="faith-reminder-settings" aria-label="묵상 시간 알림"><div><span><strong>묵상 시간 알림</strong><small>매일 말씀과 만나는 시간</small></span><button role="switch" aria-label="묵상 시간 알림" aria-checked={saved.enabled} disabled={!uid||!loaded||busy||(!saved.enabled&&(serverStatus!=='ready'||!time))} type="button" onClick={()=>void save(!saved.enabled)}><span/></button></div><label>매일<input aria-label="묵상 알림 시간" type="time" value={time} disabled={!uid||busy||serverStatus!=='ready'} onChange={e=>setTime(e.target.value)}/></label><small>{timezone} 기준 · 기기의 알림 허용이 필요해요.</small>{saved.enabled&&time!==saved.time&&<button type="button" className="faith-connection-link" disabled={busy||!time} onClick={()=>void save(true)}>시간 저장</button>}<button type="button" className="faith-connection-link" disabled={busy} onClick={()=>void allowDevicePermission()}>알림 권한 허용</button>{!uid&&<p>로그인 후 알림을 설정해주세요.</p>}{uid&&serverStatus==='checking'&&<p role="status">예약 알림 서버를 확인하고 있어요…</p>}{uid&&serverStatus==='unavailable'&&<p className="faith-reminder-unavailable">예약 푸시 서버 설정이 아직 완료되지 않았어요. 앱 안의 소식 알림은 계속 확인할 수 있어요.</p>}{busy&&<p role="status">알림을 설정하고 있어요…</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</section>
}
