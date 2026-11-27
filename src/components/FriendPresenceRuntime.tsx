import {useEffect} from 'react'
import {onValue,ref,push,set,remove,onDisconnect,serverTimestamp} from 'firebase/database'
import {getFaithAuth,getFaithDb} from '../services/faithSession'
const stops=new Map<string,()=>Promise<void>>()
export async function stopAppPresence(uid:string){await stops.get(uid)?.()}
export function FriendPresenceRuntime({uid}:{uid:string}){
 useEffect(()=>{
  if(!uid||getFaithAuth().currentUser?.uid!==uid)return
  let alive=true,connected=false,generation=0,node:ReturnType<typeof ref>|null=null
  const db=getFaithDb(),visible=()=>document.visibilityState!=='hidden'
  const clear=async()=>{generation++;const previous=node;node=null;if(previous)await remove(previous).catch(()=>{})}
  const join=async()=>{
   if(!alive||!connected||!visible()||node||getFaithAuth().currentUser?.uid!==uid)return
   const epoch=++generation,next=push(ref(db,'appPresence/'+uid));node=next
   try{await onDisconnect(next).remove();if(!alive||epoch!==generation||!visible()||getFaithAuth().currentUser?.uid!==uid){await remove(next).catch(()=>{});return}await set(next,serverTimestamp())}catch{if(node===next)node=null}
  }
  const stop=async()=>{alive=false;await clear()};stops.set(uid,stop)
  const off=onValue(ref(db,'.info/connected'),snapshot=>{connected=snapshot.val()===true;if(connected)void join();else{generation++;node=null}})
  const visibility=()=>{if(!visible())void clear();else void join()};document.addEventListener('visibilitychange',visibility)
  const timer=window.setInterval(()=>{if(node&&alive&&connected&&visible())void set(node,serverTimestamp()).catch(()=>{});else void join()},30000)
  return()=>{alive=false;off();document.removeEventListener('visibilitychange',visibility);window.clearInterval(timer);if(stops.get(uid)===stop)stops.delete(uid);void clear()}
 },[uid])
 return null
}
