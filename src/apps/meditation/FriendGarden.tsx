import {useEffect,useState} from 'react'
import {onValue,ref} from 'firebase/database'
import {getRealtimeDb} from '../../services/firebase'
import {normalizeAvatar,type AvatarProfile} from './sanctuaryCommunity'
import {PixelAvatar} from './PixelAvatar'
import './PixelAvatar.css'
import './FriendGarden.css'
import type {FriendGroup} from './useFaithConnections'
type Friend={uid:string;name:string}
export function FriendGarden({friends,uid,groups=[]}:{friends:Friend[];uid:string;groups?:FriendGroup[]}){
 const [groupId,setGroupId]=useState('')
 const activeGroup=groups.find(group=>group.id===groupId)
 const residents=[{uid,name:'나'},...friends.filter(friend=>friend.uid!==uid&&(!activeGroup||activeGroup.members?.[friend.uid]))]

 const [profiles,setProfiles]=useState<Record<string,AvatarProfile>>({}),[points,setPoints]=useState<Record<string,{x:number;y:number;facing:number}>>({}),[selected,setSelected]=useState('')
 const ids=JSON.stringify(residents.map(f=>f.uid).sort())
 useEffect(()=>{let alive=true;setProfiles({});setSelected('');const list=JSON.parse(ids) as string[]
  const random=()=>({x:12+Math.random()*76,y:40+Math.random()*46,facing:Math.random()>.5?-30:30})
  setPoints(Object.fromEntries(list.map(uid=>[uid,random()])))
  const stops=list.map(uid=>onValue(ref(getRealtimeDb(),'sanctuary/avatars/'+uid),snap=>{if(alive)setProfiles(p=>({...p,[uid]:normalizeAvatar(snap.val(),residents.find(f=>f.uid===uid)?.name)}))},()=>{}))
  const wander=()=>{if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;setPoints(Object.fromEntries(list.map(uid=>[uid,random()])))},start=window.setTimeout(wander,200),timer=window.setInterval(wander,6500)
  return()=>{alive=false;stops.forEach(off=>off());window.clearInterval(timer);window.clearTimeout(start)}
 },[ids])
 return <section className="friend-garden" aria-label="친구들의 마당"><div className="garden-groups" role="tablist" aria-label="친구 그룹"><button type="button" role="tab" aria-selected={!activeGroup} onClick={()=>setGroupId('')}>전체</button>{groups.map(group=><button type="button" role="tab" key={group.id} aria-selected={activeGroup?.id===group.id} onClick={event=>{setGroupId(group.id);event.currentTarget.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'smooth'})}}>{group.name}</button>)}</div><div className="friend-garden-lawn"><i className="garden-tree tree-left" aria-hidden="true"/><i className="garden-tree tree-right" aria-hidden="true"/><span className="garden-path" aria-hidden="true"/>{residents.map(friend=>{const point=points[friend.uid]||{x:50,y:65,facing:-30},profile=profiles[friend.uid]||normalizeAvatar(null,friend.name);return <button type="button" className="garden-friend" key={friend.uid} style={{left:point.x+'%',top:point.y+'%',zIndex:selected===friend.uid?200:Math.round(point.y)}} aria-label={friend.name+' 아바타'} aria-expanded={selected===friend.uid} onClick={()=>setSelected(s=>s===friend.uid?'':friend.uid)}><PixelAvatar profile={profile} facing={point.facing} moving={true} seated={false} scale={.9} label={friend.name+'의 아바타'}/>{selected===friend.uid&&<span className="garden-name" role="status" style={point.x<25?{left:0,transform:'none'}:point.x>75?{left:'auto',right:0,transform:'none'}:undefined}>{profiles[friend.uid]?.name||friend.name}</span>}</button>})}</div></section>
}
