import {getFunctions,httpsCallable} from 'firebase/functions'
import {getFaithAuth} from '../../services/faithSession'
function functionsClient(){return getFunctions(getFaithAuth().app,'us-central1')}
async function subscription(){
 if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw Error('이 브라우저는 푸시 알림을 지원하지 않습니다. iPhone은 홈 화면에 앱을 추가한 뒤 설정해주세요.')
 if(Notification.permission!=='granted')throw Error('브라우저 설정에서 알림을 허용해주세요.')
 const registration=await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('앱 준비가 끝난 뒤 다시 시도해주세요.')),12000))])
 const result=await httpsCallable<unknown,{publicKey:string}>(functionsClient(),'faithPushKey')({})
 const old=await registration.pushManager.getSubscription(),key=result.data.publicKey
 const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))
 if(old){const oldKey=old.options.applicationServerKey;if(oldKey&&Array.from(new Uint8Array(oldKey)).join(',')!==Array.from(bytes).join(','))await old.unsubscribe();else return old.toJSON()}
 return (await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes})).toJSON()
}

export async function enrollReminderPush(uid:string){if(!uid||getFaithAuth().currentUser?.uid!==uid||typeof Notification==='undefined'||Notification.permission!=='granted')return false;try{const ready=await httpsCallable<unknown,{scheduledReady:boolean}>(functionsClient(),'faithPushKey')({});if(!ready.data.scheduledReady)return false;const push=await subscription();if(getFaithAuth().currentUser?.uid!==uid)return false;await httpsCallable(functionsClient(),'configureFaithReminder')({deviceOnly:true,enabled:false,time:'07:00',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul',subscription:push});return true}catch{return false}}
