import { useCallback, useEffect, useRef, useState } from 'react'
import { safeSanctuaryPoint, sanctuaryPath, stepSanctuaryPoint, type FloorPoint, type WalkDirection } from './sanctuaryMovement'
const nextFrame=(callback:FrameRequestCallback)=>typeof requestAnimationFrame==='function'?requestAnimationFrame(callback):window.setTimeout(()=>callback(performance.now()),16)
const dropFrame=(id:number)=>typeof cancelAnimationFrame==='function'?cancelAnimationFrame(id):window.clearTimeout(id)
const vectors:Record<WalkDirection,FloorPoint>={north:{x:0,z:-1},south:{x:0,z:1},west:{x:-1,z:0},east:{x:1,z:0}}
const keys:Record<string,WalkDirection>={w:'north',arrowup:'north',s:'south',arrowdown:'south',a:'west',arrowleft:'west',d:'east',arrowright:'east'}
export function useSanctuaryMovement(initial:FloorPoint,onCommit?:(point:FloorPoint,facing:number)=>void) {
 const [position,setPosition]=useState(()=>safeSanctuaryPoint(initial)),[moving,setMoving]=useState(false),[facing,setFacing]=useState(-25),[seated,setSeated]=useState(false)
 const current=useRef(position),angle=useRef(-25),saved=useRef(''),commit=useRef(onCommit);commit.current=onCommit
 const pressed=useRef(new Map<string,WalkDirection>()),path=useRef<FloorPoint[]>([]),seatGoal=useRef(false),frame=useRef<number|null>(null),last=useRef(0),alive=useRef(true),tick=useRef<(now:number)=>void>(()=>{})
 const persist=useCallback(()=>{
  const p={x:Math.round(current.current.x*1000)/1000,z:Math.round(current.current.z*1000)/1000}
  const signature=JSON.stringify(p);if(saved.current===signature)return
  saved.current=signature;commit.current?.(p,angle.current)
 },[])
 const move=useCallback((dx:number,dz:number)=>{
  const before=current.current,next=stepSanctuaryPoint(before,dx,dz)
  if(next.x===before.x&&next.z===before.z)return false
  const raw=Math.atan2(dx,dz)*180/Math.PI
  const delta=((raw-angle.current+540)%360)-180
  angle.current+=delta;current.current=next;setPosition(next);setFacing(angle.current);return true
 },[])
 const schedule=useCallback(()=>{
  if(frame.current===null&&alive.current){last.current=performance.now();frame.current=nextFrame(now=>tick.current(now))}
 },[])
 tick.current=now=>{
  frame.current=null;if(!alive.current)return
  const dt=Math.min(.05,Math.max(.001,(now-last.current)/1000));last.current=now
  let changed=false
  if(pressed.current.size){
   let dx=0,dz=0;for(const direction of pressed.current.values()){dx+=vectors[direction].x;dz+=vectors[direction].z}
   const length=Math.hypot(dx,dz);if(length)changed=move(dx/length*.65*dt,dz/length*.65*dt)
  }else if(path.current.length){
   const next=path.current[0],dx=next.x-current.current.x,dz=next.z-current.current.z,length=Math.hypot(dx,dz)
   if(length<.008)path.current.shift()
   else{const step=Math.min(length,.65*dt);changed=move(dx/length*step,dz/length*step);if(!changed)path.current=[]}
  }
  setMoving(changed)
  if(pressed.current.size||path.current.length)frame.current=nextFrame(time=>tick.current(time))
  else{setMoving(false);if(seatGoal.current)setSeated(true);persist()}
 }
 const stop=useCallback((save=true)=>{
  pressed.current.clear();path.current=[];seatGoal.current=false
  if(frame.current!==null)dropFrame(frame.current);frame.current=null
  setMoving(false);if(save)persist()
 },[persist])
 useEffect(()=>{alive.current=true;const blur=()=>stop();const hide=()=>{if(document.hidden)stop()};window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hide);return()=>{alive.current=false;if(frame.current!==null)dropFrame(frame.current);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hide)}},[stop])
 function press(direction:WalkDirection,token:string=direction){
  if(pressed.current.has(token))return
  path.current=[];seatGoal.current=false;setSeated(false);pressed.current.set(token,direction)
  const vector=vectors[direction];move(vector.x*.04,vector.z*.04);schedule()
 }
 function release(token:string){pressed.current.delete(token);if(!pressed.current.size&&!path.current.length){setMoving(false);persist()}}
 function keyDown(key:string){const name=key.toLowerCase(),direction=keys[name];if(!direction)return false;press(direction,'key:'+name);return true}
 function keyUp(key:string){const name=key.toLowerCase();if(!keys[name])return false;release('key:'+name);return true}
 function goTo(point:FloorPoint,sit=false){pressed.current.clear();setSeated(false);path.current=sanctuaryPath(current.current,point);seatGoal.current=sit;schedule()}
 function nudge(direction:WalkDirection){path.current=[];setSeated(false);seatGoal.current=false;const vector=vectors[direction];move(vector.x*.055,vector.z*.055);persist()}
 return{position,moving,facing,seated,press,release,keyDown,keyUp,goTo,nudge,stop}
}
