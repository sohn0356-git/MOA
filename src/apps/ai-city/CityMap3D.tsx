import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react'
import {ArrowLeft,ArrowRight,Building2,Focus,Minus,Plus,Pause,Play} from 'lucide-react'
import type {CityProfile} from './cityResidents'
import {useCityWorld} from './CityAvatar'
import {cityBuildings,type CityBuilding} from './cityBuildings'
import {defaultCityCamera,pickCityBuilding,type CityCamera} from './city3dMath'
import {createCity3DRenderer} from './city3dRenderer'
type Props={profiles:CityProfile[];residentId:string;active:boolean;onEnter:(building:CityBuilding)=>void}
export function CityMap3D({profiles,residentId,active,onEnter}:Props){
 const {avatars,commands}=useCityWorld(),canvas=useRef<HTMLCanvasElement>(null)
 const [camera,setCamera]=useState<CityCamera>(()=>({...defaultCityCamera,target:[0,0,0]})),[hovered,setHovered]=useState<string|null>(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[ready,setReady]=useState(false)
 const [paused,setPaused]=useState(()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)),frozen=useRef(Date.now())
 const live=useRef({camera,profiles,avatars,commands,residentId,highlight:hovered,active,paused});live.current={camera,profiles,avatars,commands,residentId,highlight:hovered,active,paused}
 const enter=useRef(onEnter);enter.current=onEnter
 const gesture=useRef<{id:number;x:number;y:number;yaw:number;pitch:number;moved:boolean}|null>(null)
 const selected=cityBuildings.find(b=>b.id===hovered)
 useEffect(()=>{
  const element=canvas.current;if(!element)return
  if(typeof window.WebGLRenderingContext==='undefined'){setFailed(true);return}
  let renderer:ReturnType<typeof createCity3DRenderer>|undefined,frame=0,disposed=false,lastFrame=0
  setReady(false);setFailed(false)
  function resize(){if(disposed)return;const r=element!.getBoundingClientRect();if(r.width<1||r.height<1)return;const ratio=Math.min(window.devicePixelRatio||1,2);element!.width=Math.round(r.width*ratio);element!.height=Math.round(r.height*ratio)}
  function draw(time:number){
   if(disposed)return;frame=requestAnimationFrame(draw)
   if(!live.current.active||document.hidden||time-lastFrame<33)return
   lastFrame=time
   try{renderer?.draw({...live.current,now:live.current.paused?frozen.current:Date.now()})}catch{setFailed(true)}
  }
  const lost=(e:Event)=>{e.preventDefault();setFailed(true);setReady(false)}
  const restored=()=>setAttempt(n=>n+1)
  let observer:ResizeObserver|undefined
  try{
   renderer=createCity3DRenderer(element);resize();setReady(true)
   if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(element)}
   window.addEventListener('resize',resize);element.addEventListener('webglcontextlost',lost);element.addEventListener('webglcontextrestored',restored)
   frame=requestAnimationFrame(draw)
  }catch{setFailed(true)}
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);element.removeEventListener('webglcontextlost',lost);element.removeEventListener('webglcontextrestored',restored);renderer?.dispose()}
 },[attempt])
 function zoom(delta:number){setCamera(c=>({...c,distance:Math.max(55,Math.min(190,c.distance+delta))}))}
 function point(e:ReactPointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return pickCityBuilding(cityBuildings,live.current.camera,(e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2,r.width/r.height)}
 function down(e:ReactPointerEvent<HTMLCanvasElement>){if(e.button!==0)return;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:camera.yaw,pitch:camera.pitch,moved:false};e.currentTarget.setPointerCapture?.(e.pointerId)}
 function move(e:ReactPointerEvent<HTMLCanvasElement>){
  const g=gesture.current
  if(g&&g.id===e.pointerId){const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.hypot(dx,dy)>7)g.moved=true;if(g.moved)setCamera(c=>({...c,yaw:g.yaw-dx*.008,pitch:Math.max(.35,Math.min(1.2,g.pitch+dy*.005))}));return}
  setHovered(point(e)?.id??null)
 }
 function up(e:ReactPointerEvent<HTMLCanvasElement>){const g=gesture.current;gesture.current=null;if(g&&g.id===e.pointerId&&!g.moved){const building=point(e);if(building)enter.current(building)}}
 function pause(){if(!paused)frozen.current=Date.now();setPaused(v=>!v)}
 return <section className="city-map-3d" aria-label="3D 도시 지도" data-renderer={failed?'fallback':ready?'webgl':'loading'}>
 <header><div><span className="city-social-kicker">UPPER FLOOR · EXPLORE</span><h2>우리 도시, 3D로 둘러보기</h2></div><p>건물을 누르면 아래 화면이 넓어집니다.</p></header>
 <div className="city-3d-stage">
 <canvas ref={canvas} hidden={failed} role="img" aria-label="회전 가능한 AI City 3D 지도" data-camera={[camera.yaw,camera.pitch,camera.distance].join(',')} tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{gesture.current=null}} onLostPointerCapture={()=>{gesture.current=null}} onPointerLeave={()=>{if(!gesture.current)setHovered(null)}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setCamera(c=>({...c,yaw:c.yaw+(e.key==='ArrowLeft'?-.15:.15)}))}if(e.key==='+'||e.key==='='){e.preventDefault();zoom(-10)}if(e.key==='-'){e.preventDefault();zoom(10)}}/>
 {!ready&&!failed?<p className="city-3d-loading" role="status">입체 도시를 준비하는 중…</p>:null}
 {failed?<div className="city-3d-fallback"><Building2 size={40}/><h3>건물 목록으로 도시 둘러보기</h3><p>이 환경에서는 3D 지도를 표시할 수 없습니다. 아래 건물 버튼으로 모든 기능에 입장할 수 있습니다.</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>3D 다시 시도</button></div>:null}
 <div className="city-3d-toolbar" aria-label="3D 지도 조작"><button type="button" aria-label="3D 지도 왼쪽 회전" disabled={failed} onClick={()=>setCamera(c=>({...c,yaw:c.yaw-.25}))}><ArrowLeft size={16}/></button><button type="button" aria-label="3D 지도 오른쪽 회전" disabled={failed} onClick={()=>setCamera(c=>({...c,yaw:c.yaw+.25}))}><ArrowRight size={16}/></button><button type="button" aria-label="3D 지도 축소" disabled={failed||camera.distance>=190} onClick={()=>zoom(12)}><Minus size={16}/></button><button type="button" aria-label="3D 지도 확대" disabled={failed||camera.distance<=55} onClick={()=>zoom(-12)}><Plus size={16}/></button><button type="button" disabled={failed} onClick={()=>setCamera({...defaultCityCamera,target:[0,0,0]})}><Focus size={16}/> 시점 초기화</button><button type="button" aria-pressed={paused} disabled={failed} onClick={pause}>{paused?<Play size={15}/>:<Pause size={15}/>} {paused?'3D 관찰 재생':'3D 관찰 정지'}</button></div>
 <p className="city-3d-hint" aria-live="polite">{selected?selected.name+' · '+selected.label+' · 클릭해서 입장':'드래그로 회전 · 방향키와 확대 버튼 사용 · 초록 표식은 선택한 주민'}</p>
 </div>
 <nav className="city-building-entrances" aria-label="도시 건물 입장">{cityBuildings.map(b=><button type="button" key={b.id} id={'city-building-'+b.id} aria-label={b.name+' 입장'} onClick={()=>onEnter(b)} onFocus={()=>setHovered(b.id)} onBlur={()=>setHovered(null)}><span className="city-building-color" style={{background:b.color}}/>{b.name}<small>{b.label}</small><span aria-hidden="true">↗</span></button>)}</nav>
 </section>
}
