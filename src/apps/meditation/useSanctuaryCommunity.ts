import {useEffect,useRef,useState} from 'react'
import {ref,onValue,onDisconnect,push,set,remove,serverTimestamp,query,orderByValue,startAt,endAt,orderByChild,limitToLast,type DatabaseReference} from 'firebase/database'
import {getRealtimeDb} from '../../services/firebase'
import {defaultAvatar,normalizeAvatar,onlineMembers,koreanDayBounds,type AvatarPose,type AvatarProfile,type SharedPrayer} from './sanctuaryCommunity'
import {sanctuaryCapacity,sanctuarySpawn,type FloorPoint} from './sanctuaryMovement'
import type {SanctuaryMember} from './sanctuaryState'
export function useSanctuaryCommunity(member:SanctuaryMember,entered:boolean){
 const [profile,setProfile]=useState(()=>defaultAvatar(member.displayName)),[raw,setRaw]=useState<Record<string,Record<string,unknown>>|null|undefined>(undefined)
 const [prayers,setPrayers]=useState<SharedPrayer[]>([]),[intercessions,setIntercessions]=useState<Record<string,Record<string,{at:number}>>>({}),[visitors,setVisitors]=useState<number|null>(null)
 const [readPrayers,setReadPrayers]=useState<Record<string,true>|null>(null)
 const [error,setError]=useState(''),[connected,setConnected]=useState(false),[joined,setJoined]=useState(false),[loaded,setLoaded]=useState(false),[offset,setOffset]=useState(0),[clock,setClock]=useState(Date.now())
 const profileRef=useRef(profile);profileRef.current=profile
 const position=useRef({point:sanctuarySpawn,facing:-25,moving:false,pose:'standing' as AvatarPose}),live=useRef<DatabaseReference|null>(null),dirty=useRef(false)
 const day=Math.floor((clock+offset+32400000)/86400000)
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer)},[])
 useEffect(()=>{
  let db:ReturnType<typeof getRealtimeDb>
  try{db=getRealtimeDb()}catch{setError('공유 기능에 연결하지 못했습니다. 연결 설정을 확인한 뒤 다시 방문해주세요.');return}
  let alive=true,generation=0,connection:DatabaseReference|null=null
  const fail=()=>{if(alive)setError('공유 기능과 연결되지 않았습니다. 연결을 확인하고 다시 시도해주세요.')}
  const stop=()=>{generation++;live.current=null;if(connection){void remove(connection).catch(()=>{});connection=null}setJoined(false)}
  async function join(){
   if(!entered||!alive||document.hidden||connection)return
   const epoch=++generation,node=push(ref(db,'sanctuary/presence/'+member.uid));connection=node
   try{
    await onDisconnect(node).remove()
    if(!alive||document.hidden||epoch!==generation){void remove(node).catch(()=>{});return}
    live.current=node
    const p=position.current
    await set(node,{...profileRef.current,...p.point,facing:p.facing,moving:p.moving,pose:p.pose,updatedAt:serverTimestamp()})
    if(alive&&epoch===generation){setJoined(true);setError('')}
   }catch{if(connection===node){connection=null;live.current=null}fail()}
  }
  let online=false
  const visible=()=>{if(document.hidden)stop();else if(online)void join()}
  const subscriptions=[
   onValue(ref(db,'.info/serverTimeOffset'),s=>{if(alive)setOffset(Number(s.val())||0)}),
   onValue(ref(db,'.info/connected'),s=>{online=s.val()===true;setConnected(online);if(online)void join();else stop()}),
   onValue(ref(db,'sanctuary/avatars/'+member.uid),s=>{if(alive){setProfile(normalizeAvatar(s.val(),member.displayName))}},fail),
   onValue(ref(db,'sanctuary/presence'),s=>{if(alive)setRaw(s.val())},fail),
   onValue(query(ref(db,'sanctuary/prayers'),orderByChild('createdAt'),limitToLast(100)),s=>{
    if(!alive)return;setPrayers(Object.entries(s.val()||{}).map(([id,p])=>({...p as Omit<SharedPrayer,'id'>,id})).sort((a,b)=>b.createdAt-a.createdAt));setLoaded(true)
   },fail),
   onValue(ref(db,'users/'+member.uid+'/sanctuaryPrayerReads'),s=>{if(alive)setReadPrayers(s.val()||{})},fail),
   onValue(ref(db,'sanctuary/intercessions'),s=>{if(alive)setIntercessions(s.val()||{})},fail),
  ]
  const publish=()=>{const node=live.current;if(!node||document.hidden)return;const p=position.current;void set(node,{...profileRef.current,...p.point,facing:p.facing,moving:p.moving,pose:p.pose,updatedAt:serverTimestamp()}).catch(fail)}
  const motion=window.setInterval(()=>{if(dirty.current){dirty.current=false;publish()}},150)
  const heartbeat=window.setInterval(publish,20000)
  document.addEventListener('visibilitychange',visible)
  return()=>{alive=false;stop();subscriptions.forEach(off=>off());window.clearInterval(motion);window.clearInterval(heartbeat);document.removeEventListener('visibilitychange',visible)}
 },[member.uid,member.displayName,entered])
 useEffect(()=>{
  let db:ReturnType<typeof getRealtimeDb>;try{db=getRealtimeDb()}catch{return}
  const bounds=koreanDayBounds(Date.now()+offset)
  const off=onValue(query(ref(db,'sanctuary/visits'),orderByValue(),startAt(bounds.start),endAt(bounds.end)),s=>setVisitors(s.size),()=>setVisitors(null))
  return off
 },[day,offset])
 useEffect(()=>{
  if(!joined)return
  void set(ref(getRealtimeDb(),'sanctuary/visits/'+member.uid),serverTimestamp()).catch(()=>setError('오늘 접속 기록을 저장하지 못했습니다.'))
 },[member.uid,day,joined])
 async function saveProfile(next:AvatarProfile){await set(ref(getRealtimeDb(),'sanctuary/avatars/'+member.uid),normalizeAvatar(next));dirty.current=true}
 function move(point:FloorPoint,facing:number,moving=false,pose:AvatarPose='standing'){position.current={point,facing,moving,pose};dirty.current=true}
 async function savePrayer(title:string,body:string,id?:string){
  const trimmed=title.trim(),text=body.trim();if(!trimmed||!text||trimmed.length>80||text.length>1500)throw new Error('제목 80자, 내용 1500자 이내로 입력해주세요.')
  const db=getRealtimeDb(),existing=id?prayers.find(p=>p.id===id):null,node=id?ref(db,'sanctuary/prayers/'+id):push(ref(db,'sanctuary/prayers'))
  if(id&&existing?.uid!==member.uid)throw new Error('본인의 기도제목만 수정할 수 있습니다.')
  await set(node,{uid:member.uid,name:profileRef.current.name,title:trimmed,body:text,createdAt:existing?.createdAt||serverTimestamp(),updatedAt:serverTimestamp(),answered:existing?.answered||false})
 }
 async function answerPrayer(p:SharedPrayer){await set(ref(getRealtimeDb(),'sanctuary/prayers/'+p.id),{uid:p.uid,name:p.name,title:p.title,body:p.body,createdAt:p.createdAt,updatedAt:serverTimestamp(),answered:!p.answered})}
 async function deletePrayer(id:string){await remove(ref(getRealtimeDb(),'sanctuary/prayers/'+id))}
 async function pray(id:string){await set(ref(getRealtimeDb(),'sanctuary/intercessions/'+id+'/'+member.uid),{at:serverTimestamp()})}
 async function markPrayerRead(prayer:SharedPrayer){
  if(prayer.uid===member.uid||readPrayers?.[prayer.id]===true)return
  await set(ref(getRealtimeDb(),'users/'+member.uid+'/sanctuaryPrayerReads/'+prayer.id),true)
 }
 const unreadCount=readPrayers===null?0:prayers.filter(p=>p.uid!==member.uid&&readPrayers[p.id]!==true).length
 const members=onlineMembers(raw??null,clock+offset)
 const full=members.length>=sanctuaryCapacity&&!members.some(p=>p.uid===member.uid)
 return{profile,saveProfile,move,unreadCount,markPrayerRead,peers:entered&&joined?members.filter(p=>p.uid!==member.uid):[],online:connected&&raw!==undefined?members.length:null,visitors,connected,joined,full,loaded,prayers,intercessions,error,savePrayer,answerPrayer,deletePrayer,pray}
}
export type SanctuaryCommunity=ReturnType<typeof useSanctuaryCommunity>
