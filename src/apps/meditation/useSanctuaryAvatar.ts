import {useEffect,useRef,useState} from 'react'
import {onValue,ref,set} from 'firebase/database'
import {getRealtimeDb} from '../../services/firebase'
import {defaultAvatar,normalizeAvatar,type AvatarProfile} from './sanctuaryCommunity'
import type {SanctuaryMember} from './sanctuaryState'
export function useSanctuaryAvatar(member:SanctuaryMember){
 const [profile,setProfile]=useState(()=>defaultAvatar(member.displayName)),[loaded,setLoaded]=useState(false),[error,setError]=useState('')
 const owner=useRef(member.uid);owner.current=member.uid
 useEffect(()=>{
  let alive=true,stop=()=>{};owner.current=member.uid
  setProfile(defaultAvatar(member.displayName));setLoaded(false);setError('')
  try{stop=onValue(ref(getRealtimeDb(),'sanctuary/avatars/'+member.uid),s=>{if(alive){setProfile(normalizeAvatar(s.val(),member.displayName));setLoaded(true);setError('')}},()=>{if(alive)setError('아바타를 불러오지 못했습니다. 연결 상태를 확인해주세요.')})}
  catch{setError('아바타를 불러오지 못했습니다. 연결 상태를 확인해주세요.')}
  return()=>{alive=false;owner.current='';stop()}
 },[member.uid,member.displayName])
 async function saveProfile(next:AvatarProfile){
  const uid=member.uid,normalized=normalizeAvatar(next)
  await set(ref(getRealtimeDb(),'sanctuary/avatars/'+uid),normalized)
  if(owner.current===uid){setProfile(normalized);setLoaded(true)}
 }
 return{profile,loaded,error,saveProfile}
}
