import {useEffect,useState} from 'react'
import {Bell,Heart,MessageCircle,HandHeart,Sunrise} from 'lucide-react'
import {onValue,ref,query,orderByChild,limitToLast,set,serverTimestamp} from 'firebase/database'
import {getFaithAuth,getFaithDb} from '../../services/faithSession'
import type {FaithConnections,NotificationPreferences} from './useFaithConnections'
import {SanctuaryDialog} from './SanctuaryDialog'
import './FaithNotifications.css'
export type ActivityNotice={id:string;kind:'comment'|'like'|'intercession'|'reminder';actorUid:string;actorName:string;sourceId?:string;title:string;body:string;targetId:string;createdAt:number;readAt?:number}
export function useActivityNotices(uid:string){
 const [state,setState]=useState<{owner:string;items:ActivityNotice[];reads:Record<string,number>;error:string}>({owner:uid,items:[],reads:{},error:''})
 useEffect(()=>{let alive=true;setState({owner:uid,items:[],reads:{},error:''});if(!uid)return
  const off=onValue(query(ref(getFaithDb(),'faithNotifications/'+uid),orderByChild('createdAt'),limitToLast(100)),snap=>{if(alive)setState(previous=>({...previous,owner:uid,items:Object.entries(snap.val()||{}).map(([id,v])=>({...v as Omit<ActivityNotice,'id'>,id})).sort((a,b)=>b.createdAt-a.createdAt),error:''}))},()=>{if(alive)setState(s=>({...s,error:'알림을 불러오지 못했습니다. 다시 접속해주세요.'}))})
  const offReads=onValue(ref(getFaithDb(),'users/'+uid+'/activityNotificationReads'),snap=>{if(alive)setState(previous=>({...previous,reads:snap.val()||{}}))})
  return()=>{alive=false;off();offReads()}
 },[uid])
 async function read(item:ActivityNotice){if(getFaithAuth().currentUser?.uid!==uid)throw Error('로그인이 필요합니다.');await set(ref(getFaithDb(),`users/${uid}/activityNotificationReads/${item.id}`),serverTimestamp())}
 return{items:state.owner===uid?state.items.map(item=>({...item,readAt:Math.max(item.readAt||0,state.reads[item.id]||0)||undefined})):[],error:state.owner===uid?state.error:'',read}
}
export function FaithNotificationCenter({social,preferences,onFriends,onOpen}:{social:FaithConnections;preferences:NotificationPreferences;onFriends:()=>void;onOpen:(notice:ActivityNotice)=>void}){
 const inbox=useActivityNotices(social.uid),[open,setOpen]=useState(false),[error,setError]=useState('')
 if(!social.uid)return null
 const friendNotices=preferences.friends?social.notices:[],items=inbox.items.filter(n=>n.kind==='intercession'?preferences.chapel:n.kind==='reminder'||preferences.activity!==false)
 const unread=(preferences.friends?social.unread.length:0)+items.filter(n=>!n.readAt).length
 const rows=[...friendNotices.map(n=>({id:'friend:'+n.id,at:n.updatedAt,friend:n})),...items.map(n=>({id:n.id,at:n.createdAt,activity:n}))].sort((a,b)=>b.at-a.at)
 async function act(task:()=>Promise<void>){setError('');try{await task();setOpen(false)}catch{setError('알림을 처리하지 못했습니다. 다시 시도해주세요.')}}
 return <><button type="button" className="faith-connections-bell faith-home-notification" aria-label={'알림'+(unread?' '+unread+'개':'')} onClick={()=>setOpen(true)}><Bell size={19}/>{unread>0&&<span>{unread>99?'99+':unread}</span>}</button>
 {open&&<SanctuaryDialog open title="알림" className="faith-connections-dialog" onClose={()=>setOpen(false)}>{(error||inbox.error)&&<p role="alert">{error||inbox.error}</p>}<div className="faith-activity-notices">{rows.length?rows.map(row=>{
 if('friend'in row){const n=row.friend,name=n.from===social.uid?n.toName:n.fromName;return <button type="button" key={row.id} onClick={()=>void act(async()=>{await social.markRead(n);onFriends()})}><HandHeart size={20}/><span><strong>{name}</strong><small>{n.status==='accepted'?'친구 요청을 수락했어요.':'친구 요청을 보냈어요.'}</small></span></button>}
 const n=row.activity,Icon=n.kind==='like'?Heart:n.kind==='comment'?MessageCircle:n.kind==='reminder'?Sunrise:HandHeart
 return <button type="button" key={row.id} data-unread={!n.readAt} onClick={()=>void act(async()=>{await inbox.read(n);onOpen(n)})}><Icon size={20}/><span><strong>{n.title}</strong><small>{n.actorName&&n.kind!=='reminder'?n.actorName+' · ':''}{n.body}</small><time>{new Date(n.createdAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></span>{!n.readAt&&<i aria-label="읽지 않음"/>}</button>
 }):<p>아직 받은 알림이 없어요.</p>}</div></SanctuaryDialog>}
 </>
}
