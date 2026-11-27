import {useEffect,useState} from 'react'
import {onValue,ref} from 'firebase/database'
import {getFaithDb} from '../../services/faithSession'
export function hasLiveConnection(value:Record<string,number>|null,now:number){return Object.values(value||{}).some(at=>typeof at==='number'&&at>now-90000&&at<=now+10000)}
export function useFriendOnline(ids:string[]){
 const key=JSON.stringify([...new Set(ids)].sort()),[state,setState]=useState<{key:string;raw:Record<string,Record<string,number>|null>}>({key:'',raw:{}}),[clock,setClock]=useState(Date.now()),[offset,setOffset]=useState(0)
 useEffect(()=>{let alive=true;setState({key,raw:{}});setOffset(0);const list=JSON.parse(key) as string[];if(!list.length)return
  const stops=list.map(uid=>onValue(ref(getFaithDb(),'appPresence/'+uid),snapshot=>{if(alive)setState(p=>({...p,raw:{...p.raw,[uid]:snapshot.val()}}))},()=>{if(alive)setState(p=>({...p,raw:{...p.raw,[uid]:null}}))}))
  stops.push(onValue(ref(getFaithDb(),'.info/serverTimeOffset'),snapshot=>{if(alive)setOffset(Number(snapshot.val())||0)}));const timer=window.setInterval(()=>setClock(Date.now()),15000)
  return()=>{alive=false;stops.forEach(stop=>stop());window.clearInterval(timer)}
 },[key])
 return Object.fromEntries((JSON.parse(key) as string[]).map(uid=>[uid,state.key===key&&hasLiveConnection(state.raw[uid]||null,Math.max(clock,Date.now())+offset)]))
}
