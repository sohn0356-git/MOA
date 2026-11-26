import {useEffect,useState} from 'react'
import {onValue,ref,query,orderByChild,equalTo,set,update,remove,push,serverTimestamp,runTransaction} from 'firebase/database'
import {getFaithAuth,getFaithDb} from '../../services/faithSession'
export type FriendRequest={id:string;from:string;to:string;fromName:string;toName:string;status:'pending'|'accepted'|'rejected';createdAt:number;updatedAt:number}
export type FriendGroup={id:string;name:string;createdAt:number;members?:Record<string,true>}
export type NotificationPreferences={friends:boolean;chapel:boolean;activity?:boolean}
const defaults:NotificationPreferences={friends:true,chapel:true,activity:true}
export function useNotificationPreferences(uid:string){
 const [state,setState]=useState({owner:uid,loaded:!uid,values:defaults}),[error,setError]=useState('')
 useEffect(()=>{let alive=true;setError('');setState({owner:uid,loaded:!uid,values:defaults});if(!uid)return
  const off=onValue(ref(getFaithDb(),'users/'+uid+'/notificationPreferences'),s=>{if(alive)setState({owner:uid,loaded:true,values:{friends:s.val()?.friends!==false,chapel:s.val()?.chapel!==false,activity:s.val()?.activity!==false}})},()=>{if(alive)setError('알림 설정을 불러오지 못했습니다.')})
  return()=>{alive=false;off()}
 },[uid])
 async function toggle(key:keyof NotificationPreferences){
  if(!uid||getFaithAuth().currentUser?.uid!==uid)throw Error('로그인 후 설정해주세요.')
  setError('');try{await set(ref(getFaithDb(),'users/'+uid+'/notificationPreferences/'+key),!state.values[key])}catch{setError('알림 설정을 저장하지 못했습니다.');throw Error('알림 설정을 저장하지 못했습니다.')}
 }
 return{values:state.owner===uid?state.values:defaults,loaded:state.owner===uid&&state.loaded,error,toggle}
}
const list=<T,>(raw:Record<string,unknown>|null):T[]=>Object.entries(raw||{}).map(([id,value])=>({...value as object,id} as T))
export function useFaithConnections(uid:string,name:string){
 const empty=()=>({owner:uid,incoming:[] as FriendRequest[],outgoing:[] as FriendRequest[],groups:[] as FriendGroup[],reads:{} as Record<string,number>,ready:0})
 const [state,setState]=useState(empty),[error,setError]=useState(''),[retryKey,setRetryKey]=useState(0)
 useEffect(()=>{let alive=true;setState(empty());setError('');if(!uid)return
  const db=getFaithDb(),fail=()=>{if(alive)setError('친구 정보를 불러오지 못했습니다. 연결을 확인해주세요.')}
  const subscribe=(key:'incoming'|'outgoing'|'groups'|'reads',node:ReturnType<typeof query>)=>onValue(node,s=>{if(alive)setState(current=>({...current,[key]:key==='reads'?s.val()||{}:list(s.val()),ready:current.ready|({incoming:1,outgoing:2,groups:4,reads:8}[key])}))},fail)
  const stops=[subscribe('incoming',query(ref(db,'friendRequests'),orderByChild('to'),equalTo(uid))),subscribe('outgoing',query(ref(db,'friendRequests'),orderByChild('from'),equalTo(uid))),subscribe('groups',ref(db,'users/'+uid+'/friendGroups')),subscribe('reads',ref(db,'users/'+uid+'/friendNotificationReads'))]
  return()=>{alive=false;stops.forEach(stop=>stop())}
 },[uid,retryKey])
 const current=state.owner===uid?state:empty(),requests=[...current.incoming,...current.outgoing]
 const friends=[...new Map(requests.filter(r=>r.status==='accepted').map(r=>{const incoming=r.to===uid;return[incoming?r.from:r.to,{uid:incoming?r.from:r.to,name:incoming?r.fromName:r.toName}]})).values()]
 const notices=requests.filter(r=>r.to===uid&&r.status==='pending'||r.from===uid&&r.status==='accepted').sort((a,b)=>b.updatedAt-a.updatedAt)
 function guard(){if(!uid||getFaithAuth().currentUser?.uid!==uid)throw Error('로그인 계정을 확인해주세요.')}
 function relationship(target:string){return requests.find(r=>r.status==='accepted'&&(r.from===target||r.to===target))||requests.find(r=>r.status==='pending'&&(r.from===target||r.to===target))||requests.find(r=>r.from===target||r.to===target)}
 async function send(target:string,targetName:string){guard();if(target===uid)throw Error('나에게 요청할 수 없습니다.')
  const previous=relationship(target);if(previous&&previous.status!=='rejected')return
  const id=uid+'__'+target
  await set(ref(getFaithDb(),'friendRequests/'+id),previous?.from===uid?{...previous,id:null,status:'pending',updatedAt:serverTimestamp()}:{from:uid,to:target,fromName:name.trim().slice(0,24)||'이웃',toName:targetName.trim().slice(0,24)||'이웃',status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()})
 }
 async function respond(request:FriendRequest,accept:boolean){guard();await update(ref(getFaithDb(),'friendRequests/'+request.id),{status:accept?'accepted':'rejected',updatedAt:serverTimestamp()})}
 async function cancel(request:FriendRequest){guard();await runTransaction(ref(getFaithDb(),'friendRequests/'+request.id),current=>current?.from===uid&&current.status==='pending'?null:undefined)}
 async function unfriend(target:string){guard();const changes:Record<string,null>={};for(const r of requests.filter(r=>r.from===target||r.to===target))changes['friendRequests/'+r.id]=null;for(const g of current.groups)if(g.members?.[target])changes['users/'+uid+'/friendGroups/'+g.id+'/members/'+target]=null;await update(ref(getFaithDb()),changes)}
 async function createGroup(value:string){guard();const title=value.trim();if(!title||title.length>30)throw Error('그룹 이름은 1~30자로 입력해주세요.');if(current.groups.some(g=>g.name===title))throw Error('같은 이름의 그룹이 있습니다.');await set(push(ref(getFaithDb(),'users/'+uid+'/friendGroups')),{name:title,createdAt:serverTimestamp()})}
 async function renameGroup(group:FriendGroup,value:string){guard();const title=value.trim();if(!title||title.length>30)throw Error('그룹 이름은 1~30자로 입력해주세요.');if(current.groups.some(g=>g.id!==group.id&&g.name===title))throw Error('같은 이름의 그룹이 있습니다.');await set(ref(getFaithDb(),'users/'+uid+'/friendGroups/'+group.id+'/name'),title)}
 async function deleteGroup(id:string){guard();await remove(ref(getFaithDb(),'users/'+uid+'/friendGroups/'+id))}
 async function toggleMember(group:FriendGroup,friend:string){guard();await set(ref(getFaithDb(),'users/'+uid+'/friendGroups/'+group.id+'/members/'+friend),group.members?.[friend]?null:true)}
 async function markRead(request:FriendRequest){guard();await set(ref(getFaithDb(),'users/'+uid+'/friendNotificationReads/'+request.id),request.updatedAt)}
 return{uid,error,retry:()=>setRetryKey(n=>n+1),loaded:!uid||current.ready===15,requests,friends,groups:current.groups,notices,unread:notices.filter(r=>(current.reads[r.id]||0)<r.updatedAt),relationship,send,respond,cancel,unfriend,createGroup,renameGroup,deleteGroup,toggleMember,markRead}
}
export type FaithConnections=ReturnType<typeof useFaithConnections>
