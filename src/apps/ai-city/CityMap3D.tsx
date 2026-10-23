import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react'
import {ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Building2} from 'lucide-react'
import type {CityProfile} from './cityResidents'
import {useCityWorld} from './CityAvatar'
import {cityBuildings,type CityBuilding} from './cityBuildings'
import {pickCityBuilding} from './city3dMath'
import {createCity3DRenderer} from './city3dRenderer'
import {loadStreet,saveStreet,moveStreet,streetCamera,nearbyStreetBuilding,type StreetPosition} from './cityStreet'
type Props={profiles:CityProfile[];residentId:string;active:boolean;onEnter:(building:CityBuilding)=>void}
export function CityMap3D({profiles,residentId,active,onEnter}:Props){
 const {avatars,commands}=useCityWorld(),canvas=useRef<HTMLCanvasElement>(null)
 const [position,setPosition]=useState<StreetPosition>(()=>loadStreet(residentId)),[hovered,setHovered]=useState<string|null>(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[ready,setReady]=useState(false)
 const keys=useRef(new Set<string>()),actor=useRef(residentId)
 const camera=streetCamera(position),nearby=nearbyStreetBuilding(position)
 const live=useRef({camera,profiles,avatars,commands,residentId,highlight:hovered,active,controlled:position});live.current={camera,profiles,avatars,commands,residentId,highlight:hovered,active,controlled:position}
 const enter=useRef(onEnter);enter.current=onEnter
 const gesture=useRef<{id:number;x:number;y:number;yaw:number;pitch:number;moved:boolean}|null>(null)
 function update(p:StreetPosition){live.current.controlled=p;live.current.camera=streetCamera(p);saveStreet(actor.current,p);setPosition(p)}
 useEffect(()=>{
  saveStreet(actor.current,live.current.controlled);keys.current.clear();actor.current=residentId
  const p=loadStreet(residentId);live.current.controlled=p;live.current.camera=streetCamera(p);setPosition(p)
 },[residentId])
 useEffect(()=>{if(!active){keys.current.clear();gesture.current=null;saveStreet(actor.current,live.current.controlled)}},[active])
 useEffect(()=>{
  const stop=()=>{keys.current.clear();gesture.current=null;saveStreet(actor.current,live.current.controlled)}
  window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',stop)
  return()=>{stop();window.removeEventListener('blur',stop);window.removeEventListener('pagehide',stop);document.removeEventListener('visibilitychange',stop)}
 },[])
 useEffect(()=>{
  const element=canvas.current;if(!element)return
  if(typeof window.WebGLRenderingContext==='undefined'){setFailed(true);return}
  let renderer:ReturnType<typeof createCity3DRenderer>|undefined,frame=0,disposed=false,lastFrame=0
  setReady(false);setFailed(false)
  function resize(){if(disposed)return;const r=element!.getBoundingClientRect();if(r.width<1||r.height<1)return;const ratio=Math.min(window.devicePixelRatio||1,2);element!.width=Math.round(r.width*ratio);element!.height=Math.round(r.height*ratio)}
  function draw(time:number){
   if(disposed)return;frame=requestAnimationFrame(draw)
   const dt=lastFrame?Math.min(.1,(time-lastFrame)/1000):0;lastFrame=time
   if(!live.current.active||document.hidden)return
   const k=keys.current,f=Number(k.has('w')||k.has('ArrowUp'))-Number(k.has('s')||k.has('ArrowDown')),s=Number(k.has('d')||k.has('ArrowRight'))-Number(k.has('a')||k.has('ArrowLeft'))
   if(f||s)update(moveStreet(live.current.controlled,f,s,dt))
   try{renderer?.draw({...live.current,now:Date.now()})}catch{setFailed(true)}
  }
  const lost=(e:Event)=>{e.preventDefault();keys.current.clear();setFailed(true);setReady(false)}
  const restored=()=>setAttempt(n=>n+1)
  let observer:ResizeObserver|undefined
  try{
   renderer=createCity3DRenderer(element);resize();setReady(true)
   if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(element)}
   window.addEventListener('resize',resize);element.addEventListener('webglcontextlost',lost);element.addEventListener('webglcontextrestored',restored)
   frame=requestAnimationFrame(draw)
  }catch{setFailed(true)}
  return()=>{disposed=true;keys.current.clear();cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);element.removeEventListener('webglcontextlost',lost);element.removeEventListener('webglcontextrestored',restored);renderer?.dispose()}
 },[attempt])
 function point(e:ReactPointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return pickCityBuilding(cityBuildings,live.current.camera,(e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2,r.width/r.height)}
 function down(e:ReactPointerEvent<HTMLCanvasElement>){if(e.button!==0)return;e.currentTarget.focus();gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:position.yaw,pitch:position.pitch,moved:false};e.currentTarget.setPointerCapture?.(e.pointerId)}
 function move(e:ReactPointerEvent<HTMLCanvasElement>){
  const g=gesture.current
  if(g&&g.id===e.pointerId){const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.hypot(dx,dy)>7)g.moved=true;if(g.moved)update({...live.current.controlled,yaw:g.yaw-dx*.006,pitch:Math.max(-.65,Math.min(.65,g.pitch-dy*.004))});return}
  setHovered(point(e)?.id??null)
 }
 function up(e:ReactPointerEvent<HTMLCanvasElement>){const g=gesture.current;gesture.current=null;if(g&&g.id===e.pointerId&&!g.moved){const building=point(e),near=nearbyStreetBuilding(live.current.controlled);setHovered(building?.id??null);if(building&&building.id===near?.id)enter.current(building)}}
 return <section className="city-map-3d" aria-label="3D 도시 지도" data-renderer={failed?'fallback':ready?'webgl':'loading'}>
 <header><div><span className="city-social-kicker">STREET VIEW · WALK</span><h2>아바타의 눈높이로 걷는 AI City</h2></div><p>이 브라우저에 주민별 마지막 위치와 시선이 자동 저장됩니다.</p></header>
 <div className="city-3d-stage">
 <canvas ref={canvas} hidden={failed} role="img" aria-label="아바타 시점 AI City 거리뷰" data-camera={[position.yaw,position.pitch,1].join(',')} data-position={[position.x,position.z].join(',')} tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{gesture.current=null}} onLostPointerCapture={()=>{gesture.current=null}} onBlur={()=>keys.current.clear()} onKeyDown={e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){e.preventDefault();keys.current.add(key)}if(key==='e'&&nearby){e.preventDefault();onEnter(nearby)}}} onKeyUp={e=>{keys.current.delete(e.key.length===1?e.key.toLowerCase():e.key)}}/>
 {!ready&&!failed?<p className="city-3d-loading" role="status">도시의 거리로 들어가는 중…</p>:null}
 {failed?<div className="city-3d-fallback"><Building2 size={32}/><h3>건물 목록으로 도시 둘러보기</h3><p>이 환경에서는 거리뷰를 표시할 수 없습니다. 아래 건물 버튼을 이용하세요.</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>3D 다시 시도</button></div>:null}
 <div className="city-3d-toolbar" aria-label="거리뷰 시선 조작"><button type="button" aria-label="3D 지도 왼쪽 회전" disabled={failed} onClick={()=>update({...position,yaw:position.yaw+.25})}><ArrowLeft size={16}/></button><button type="button" aria-label="3D 지도 오른쪽 회전" disabled={failed} onClick={()=>update({...position,yaw:position.yaw-.25})}><ArrowRight size={16}/></button><button type="button" disabled={failed} onClick={()=>update({...position,yaw:0,pitch:0})}>시점 초기화</button></div>
 {!failed?<div className="city-street-pad" aria-label="아바타 이동">{([['w','앞으로 이동',ArrowUp],['a','왼쪽 이동',ArrowLeft],['s','뒤로 이동',ArrowDown],['d','오른쪽 이동',ArrowRight]] as const).map(([key,label,Icon])=><button key={key} type="button" aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);keys.current.add(key)}} onPointerUp={()=>keys.current.delete(key)} onPointerCancel={()=>keys.current.delete(key)} onLostPointerCapture={()=>keys.current.delete(key)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();keys.current.add(key)}}} onKeyUp={()=>keys.current.delete(key)} onBlur={()=>keys.current.delete(key)}><Icon size={18}/></button>)}</div>:null}
 {nearby&&!failed?<button className="city-street-enter" type="button" onClick={()=>onEnter(nearby)}>{nearby.name} 입장 · E</button>:null}
 <p className="city-3d-hint">WASD / 방향키로 걷기 · 드래그로 둘러보기 · {hovered?cityBuildings.find(b=>b.id===hovered)?.name+' 앞에서 입장':'건물 앞에서 E로 입장'}</p>
 </div>
 <nav className="city-building-entrances" aria-label="도시 건물 입장">{cityBuildings.map(b=><button type="button" key={b.id} id={'city-building-'+b.id} aria-label={b.name+' 입장'} onClick={()=>onEnter(b)}><span className="city-building-color" style={{background:b.color}}/>{b.name}<small>기능 바로 열기</small><span aria-hidden="true">↗</span></button>)}</nav>
 </section>
}
