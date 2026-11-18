import {useCallback,useEffect,useRef,useState} from 'react'
import type {AvatarPose} from './sanctuaryCommunity'
import {safeSanctuaryPoint,sanctuaryPath,stepSanctuaryPoint,type FloorPoint,type WalkDirection} from './sanctuaryMovement'
const nextFrame=(callback:FrameRequestCallback)=>typeof requestAnimationFrame==='function'?requestAnimationFrame(callback):window.setTimeout(()=>callback(performance.now()),16)
const dropFrame=(id:number)=>typeof cancelAnimationFrame==='function'?cancelAnimationFrame(id):window.clearTimeout(id)
const vectors:Record<WalkDirection,FloorPoint>={north:{x:0,z:-1},south:{x:0,z:1},west:{x:-1,z:0},east:{x:1,z:0}}
const keys:Record<string,WalkDirection>={w:'north',arrowup:'north',s:'south',arrowdown:'south',a:'west',arrowleft:'west',d:'east',arrowright:'east'}
type Goal={pose:AvatarPose;facing?:number;arrive?:()=>void}
export function useSanctuaryMovement(initial:FloorPoint,onCommit?:(point:FloorPoint,facing:number)=>void,onMotion?:(point:FloorPoint,facing:number,moving:boolean,pose?:AvatarPose)=>void){
 const [position,setPosition]=useState(()=>safeSanctuaryPoint(initial)),[moving,setMoving]=useState(false),[facing,setFacing]=useState(-25),[pose,setPose]=useState<AvatarPose>('standing'),[destination,setDestination]=useState<FloorPoint|null>(null),[blocked,setBlocked]=useState(false)
 const current=useRef(position),angle=useRef(-25),posture=useRef<AvatarPose>('standing'),saved=useRef(''),commit=useRef(onCommit),motion=useRef(onMotion)
 commit.current=onCommit;motion.current=onMotion
 const analog=useRef({x:0,z:0}),pressed=useRef(new Map<string,WalkDirection>()),path=useRef<FloorPoint[]>([]),goal=useRef<Goal|null>(null)
 const frame=useRef<number|null>(null),last=useRef(0),alive=useRef(true),tick=useRef<(now:number)=>void>(()=>{})
 const persist=useCallback(()=>{
  const p={x:Math.round(current.current.x*1000)/1000,z:Math.round(current.current.z*1000)/1000}
  motion.current?.(p,angle.current,false,posture.current)
  const signature=JSON.stringify(p);if(saved.current===signature)return;saved.current=signature;commit.current?.(p,angle.current)
 },[])
 function turn(raw:number,dt:number){const delta=((raw-angle.current+540)%360+360)%360-180;angle.current+=Math.max(-720*dt,Math.min(720*dt,delta))}
 function stand(){posture.current='standing';setPose('standing')}
 function cancelGoal(){goal.current=null;path.current=[];setDestination(null)}
 function advance(dx:number,dz:number,dt:number){
  const before=current.current,next=stepSanctuaryPoint(before,dx,dz)
  if(Math.hypot(next.x-before.x,next.z-before.z)<.000001)return false
  turn(Math.atan2(next.x-before.x,next.z-before.z)*180/Math.PI,dt)
  current.current=next;return true
 }
 const schedule=useCallback(()=>{if(frame.current===null&&alive.current){last.current=performance.now();frame.current=nextFrame(time=>tick.current(time))}},[])
 function arrived(){
  const done=goal.current;goal.current=null;path.current=[];setDestination(null)
  if(done){posture.current=done.pose;setPose(done.pose);if(done.facing!==undefined)angle.current+=((done.facing-angle.current+540)%360+360)%360-180}
  setPosition({...current.current});setMoving(false);setFacing(angle.current);persist();done?.arrive?.()
 }
 tick.current=now=>{
  frame.current=null;if(!alive.current)return
  const dt=Math.min(.05,Math.max(.001,(now-last.current)/1000));last.current=now
  let changed=false,manual=false
  if(Math.hypot(analog.current.x,analog.current.z)>.01){manual=true;changed=advance(analog.current.x*.65*dt,analog.current.z*.65*dt,dt)}
  else if(pressed.current.size){
   manual=true;let dx=0,dz=0;for(const direction of pressed.current.values()){dx+=vectors[direction].x;dz+=vectors[direction].z}
   const length=Math.hypot(dx,dz);if(length)changed=advance(dx/length*.65*dt,dz/length*.65*dt,dt)
  }else if(goal.current){
   let budget=.65*dt
   while(path.current.length&&budget>0){
    const next=path.current[0],dx=next.x-current.current.x,dz=next.z-current.current.z,distance=Math.hypot(dx,dz)
    if(distance<.00001){current.current=next;path.current.shift();continue}
    const step=Math.min(distance,budget),moved=advance(dx/distance*step,dz/distance*step,dt)
    if(!moved){cancelGoal();setBlocked(true);break}
    changed=true;budget-=step
    if(distance-step<.00001){current.current=next;path.current.shift()}
   }
  }
  if(changed){setPosition({...current.current});setFacing(angle.current);motion.current?.(current.current,angle.current,true,posture.current)}
  setMoving(changed)
  if(goal.current&&!path.current.length){arrived();return}
  if(manual||path.current.length)frame.current=nextFrame(time=>tick.current(time))
  else{setMoving(false);persist()}
 }
 const stop=useCallback((save=true)=>{
  analog.current={x:0,z:0};pressed.current.clear();path.current=[];goal.current=null;setDestination(null)
  if(frame.current!==null)dropFrame(frame.current);frame.current=null;setMoving(false);if(save)persist()
 },[persist])
 useEffect(()=>{
  alive.current=true;motion.current?.(current.current,angle.current,false,posture.current)
  const blur=()=>stop(),hide=()=>{if(document.hidden)stop()},modal=(event:FocusEvent)=>{if((event.target as Element|null)?.closest?.('dialog[open]'))stop()}
  window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hide);document.addEventListener('focusin',modal)
  return()=>{alive.current=false;goal.current=null;if(frame.current!==null)dropFrame(frame.current);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hide);document.removeEventListener('focusin',modal)}
 },[stop])
 function press(direction:WalkDirection,token:string=direction){if(pressed.current.has(token))return;analog.current={x:0,z:0};cancelGoal();setBlocked(false);stand();pressed.current.set(token,direction);schedule()}
 function release(token:string){pressed.current.delete(token);if(!pressed.current.size&&!path.current.length){setMoving(false);persist()}}
 function keyDown(key:string){const name=key.toLowerCase(),direction=keys[name];if(!direction)return false;press(direction,'key:'+name);return true}
 function keyUp(key:string){const name=key.toLowerCase();if(!keys[name])return false;release('key:'+name);return true}
 function joystick(x:number,z:number){
  const length=Math.hypot(x,z),scale=length>1?1/length:1;analog.current={x:x*scale,z:z*scale};pressed.current.clear()
  if(length>.01){cancelGoal();setBlocked(false);stand();schedule()}else if(!path.current.length){setMoving(false);persist()}
 }
 function goTo(point:FloorPoint,sit=false,arrive?:()=>void,finalFacing?:number){
  analog.current={x:0,z:0};pressed.current.clear();cancelGoal();stand();setBlocked(false)
  const route=sanctuaryPath(current.current,point)
  if(!route.length){setBlocked(true);setMoving(false);persist();return}
  path.current=route;goal.current={pose:sit?'sitting':'standing',facing:finalFacing,arrive};setDestination(route[route.length-1]);schedule()
 }
 function nudge(direction:WalkDirection){stop(false);stand();const v=vectors[direction];advance(v.x*.035,v.z*.035,.05);setPosition({...current.current});setFacing(angle.current);persist()}
 function setPosture(next:AvatarPose){stop();posture.current=next;setPose(next);motion.current?.(current.current,angle.current,false,next)}
 function releaseInput(){analog.current={x:0,z:0};pressed.current.clear();if(!goal.current)stop()}
 return{position,moving,facing,pose,seated:pose==='sitting',setPosture,joystick,press,release,keyDown,keyUp,goTo,nudge,stop,releaseInput,destination,blocked}
}
