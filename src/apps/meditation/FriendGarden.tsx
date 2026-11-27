import {useEffect,useState,useRef} from 'react'
import {onValue,ref} from 'firebase/database'
import {getRealtimeDb} from '../../services/firebase'
import {normalizeAvatar,type AvatarProfile} from './sanctuaryCommunity'
import {PixelAvatar} from './PixelAvatar'
import './PixelAvatar.css'
import './FriendGarden.css'
import villageUrl from '../../assets/faith/friend-village.svg'
import {createGardenResident,advanceGardenResident,type GardenResident} from './gardenMotion'
import {useFriendOnline} from './useFriendOnline'
import {useGardenPinch} from './useGardenPinch'
import type {FriendGroup} from './useFaithConnections'
type Friend={uid:string;name:string}
export function FriendGarden({friends,uid,groups=[]}:{friends:Friend[];uid:string;groups?:FriendGroup[]}){
 const viewportRef=useRef<HTMLDivElement>(null)
 const {zoom,onClickCapture}=useGardenPinch(viewportRef)
 const lawnRef=useRef<HTMLDivElement>(null)
 const [groupId,setGroupId]=useState('')
 const activeGroup=groups.find(group=>group.id===groupId)
 const residents=[{uid,name:'나'},...friends.filter(friend=>friend.uid!==uid&&(!activeGroup||activeGroup.members?.[friend.uid]))]

 const [profiles,setProfiles]=useState<Record<string,AvatarProfile>>({}),[points,setPoints]=useState<Record<string,GardenResident>>({}),[selected,setSelected]=useState('')
 const online=useFriendOnline(residents.filter(friend=>friend.uid!==uid).map(friend=>friend.uid))
 const ids=JSON.stringify(residents.map(f=>f.uid).sort())
 useEffect(()=>{
  let alive=true,frame=0,last=0,elapsed=0
  setProfiles({});setSelected('')
  const list=JSON.parse(ids) as string[],positions=Object.fromEntries(list.map(residentUid=>[residentUid,createGardenResident(Math.random,residentUid===uid,list.filter(id=>id!==uid).indexOf(residentUid))]))
  setPoints({...positions})
  const stops=list.map(uid=>onValue(ref(getRealtimeDb(),'sanctuary/avatars/'+uid),snap=>{if(alive)setProfiles(p=>({...p,[uid]:normalizeAvatar(snap.val(),residents.find(f=>f.uid===uid)?.name)}))},()=>{}))
  const animate=(time:number)=>{
   if(!alive)return
   frame=requestAnimationFrame(animate)
   if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){last=time;return}
   if(!last){last=time;return}const dt=(time-last)/1000;if(dt<1/30)return;last=time;elapsed+=Math.min(dt,.05)*1000
   const width=lawnRef.current?.clientWidth||300,height=lawnRef.current?.clientHeight||300
   let changed=false
   for(const uid of list){const next=advanceGardenResident(positions[uid],dt,width,height,elapsed);if(next!==positions[uid]){positions[uid]=next;changed=true}}
   if(changed)setPoints({...positions})
  }
  frame=requestAnimationFrame(animate)
  return()=>{alive=false;stops.forEach(off=>off());cancelAnimationFrame(frame)}
 },[ids])

 return <section className="friend-garden" aria-label="친구들의 마당"><div className="garden-groups" role="tablist" aria-label="친구 그룹"><button type="button" role="tab" aria-selected={!activeGroup} onClick={()=>setGroupId('')}>전체</button>{groups.map(group=><button type="button" role="tab" key={group.id} aria-selected={activeGroup?.id===group.id} onClick={event=>{setGroupId(group.id);event.currentTarget.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'smooth'})}}>{group.name}</button>)}</div><div className="garden-viewport" ref={viewportRef} onClickCapture={onClickCapture} tabIndex={0} aria-label="마당 둘러보기"><div className="garden-canvas" style={{width:zoom*160+'%'}}><div className="friend-garden-lawn" ref={lawnRef} style={{width:100/zoom+'%',transform:`scale(${zoom})`,backgroundImage:`url(${villageUrl})`}}>{residents.map(friend=>{const point=points[friend.uid]||{x:50,y:65,facing:0,moving:false},profile=profiles[friend.uid]||normalizeAvatar(null,friend.name);return <button type="button" className="garden-friend" key={friend.uid} style={{left:point.x+'%',top:point.y+'%',zIndex:selected===friend.uid?200:Math.round(point.y)}} aria-label={friend.name+' 아바타'} aria-expanded={selected===friend.uid} onClick={()=>setSelected(s=>s===friend.uid?'':friend.uid)}><PixelAvatar profile={profile} facing={point.facing} moving={point.moving} seated={false} scale={.48} label={friend.name+'의 아바타'}/>{online[friend.uid]&&<i className="garden-online" role="img" aria-label={friend.name+' 접속 중'}/>} {selected===friend.uid&&<span className="garden-name" role="status" style={point.x<25?{left:0,transform:'none'}:point.x>75?{left:'auto',right:0,transform:'none'}:undefined}>{profiles[friend.uid]?.name||friend.name}</span>}</button>})}</div></div></div></section>
}
