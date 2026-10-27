import {useState,useRef,useEffect} from 'react'
import {CityMeet} from './CityMeet'
import {CityVillageAvatar} from './CityVillageAvatar'
import {CityJoystick} from './CityJoystick'
import {cityBuildings,type CityBuilding} from './cityBuildings'
import {moveVillage,villageStart,villageDepth,villageProjection,villageCamera} from './cityVillageGround'
import type {CityProfile} from './cityResidents'
import type {CityPost} from './cityService'
import './CityVillage.css'
const directions:Record<string,[number,number]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}
export function CityVillage({profiles,posts,ready,residentId,onOpen,onEnter}:{profiles:CityProfile[];posts?:CityPost[];ready?:boolean;residentId:string;onOpen?:(id:string)=>void;onEnter:(b:CityBuilding)=>void}){
 const [pos,setPos]=useState(villageStart),[scale,setScale]=useState(1),[walking,setWalking]=useState(false),[facing,setFacing]=useState(1),[size,setSize]=useState({width:1200,height:800})
 const root=useRef<HTMLElement>(null),position=useRef(villageStart),stick=useRef({x:0,y:0}),velocity=useRef({x:0,y:0}),keys=useRef(new Set<string>()),last=useRef(0),frame=useRef(0),running=useRef(false)
 function stop(){stick.current={x:0,y:0};velocity.current={x:0,y:0};keys.current.clear();cancelAnimationFrame(frame.current);running.current=false;setWalking(false)}
 useEffect(()=>{const el=root.current;if(!el)return;const resize=()=>{const r=el.getBoundingClientRect();if(r.width&&r.height)setSize({width:r.width,height:r.height})};resize();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(el);window.addEventListener('resize',resize);window.addEventListener('blur',stop);window.addEventListener('city-stop-walking',stop);document.addEventListener('visibilitychange',stop);return()=>{observer?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('blur',stop);window.removeEventListener('city-stop-walking',stop);document.removeEventListener('visibilitychange',stop);cancelAnimationFrame(frame.current)}},[])
 function begin(){if(running.current)return;running.current=true;last.current=performance.now();const tick=(t:number)=>{const dt=Math.min(.035,(t-last.current)/1000);last.current=t;let x=stick.current.x,y=stick.current.y;for(const k of keys.current){x+=directions[k]?.[0]??0;y+=directions[k]?.[1]??0}const len=Math.max(1,Math.hypot(x,y)),blend=1-Math.exp(-dt*14);velocity.current.x+=(x/len-velocity.current.x)*blend;velocity.current.y+=(y/len-velocity.current.y)*blend;const v=velocity.current,p=position.current,next=moveVillage(p,v.x*dt*8,v.y*dt*12),moving=Math.hypot(next.x-p.x,next.y-p.y)>.001;position.current=next;setPos(next);setWalking(moving);if(Math.abs(v.x)>.1)setFacing(v.x<0?-1:1);if(Math.hypot(v.x,v.y)>.015||x||y)frame.current=requestAnimationFrame(tick);else{running.current=false;setWalking(false)}};frame.current=requestAnimationFrame(tick)}
 const camera=villageCamera(pos,size.width,size.height,scale),view={...size,zoom:scale,camera},feet=villageProjection(pos,size.width,size.height,scale,camera),worldWidth=Math.max(size.width,size.height*1.5),depth=villageDepth(pos.y)*scale
 return <section ref={root} className="city-village" aria-label="마을 산책" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))stop()}} onKeyDown={e=>{if(e.target!==e.currentTarget||!directions[e.key])return;e.preventDefault();keys.current.add(e.key);begin()}} onKeyUp={e=>{keys.current.delete(e.key)}} tabIndex={0}>
 <div className="city-village-world" style={{width:worldWidth,height:worldWidth/1.5,left:size.width/2+(50-camera.x)*worldWidth/100*scale,top:size.height/2+(50-camera.y)*worldWidth/150*scale,transform:`translate(-50%,-50%) scale(${scale})`}}><div className="city-village-ground"/></div>
 <div className="city-village-player" data-x={pos.x.toFixed(3)} data-y={pos.y.toFixed(3)} style={{left:feet.left,top:feet.top,zIndex:Math.round(pos.y),transform:`translate(-50%,-100%) scale(${depth})`}}><CityVillageAvatar id={residentId} name="내 산책 캐릭터" walking={walking} facing={facing}/><span>나의 산책</span></div>
 <CityMeet village villageView={view} profiles={profiles} posts={posts} ready={ready} onOpen={onOpen}/>
 <header className="city-village-title"><small>OUR LITTLE NEIGHBOURHOOD</small><h2>오늘은 누구를 만날까요?</h2><p>길을 따라 산책하고 이웃을 눌러보세요</p></header>
 <div className="city-village-camera"><button aria-label="마을 확대" onClick={()=>{stop();setScale(s=>Math.min(1.5,s+.1))}}>＋</button><button aria-label="마을 축소" onClick={()=>{stop();setScale(s=>Math.max(1,s-.1))}}>−</button></div>
 <CityJoystick active onMove={v=>{stick.current={x:v.side,y:-v.forward};begin()}}/><p className="city-village-note">방향키·WASD로 길 산책 · 주민 위치는 연출</p>
 <nav className="city-village-places" aria-label="마을 장소">{cityBuildings.map(b=><button key={b.id} onClick={()=>{stop();onEnter(b)}}>{b.name}<small>{b.label}</small></button>)}</nav>
 </section>
}
