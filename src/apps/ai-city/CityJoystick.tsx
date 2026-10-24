import {useEffect,useRef,useState,type PointerEvent} from 'react'
type Vector={forward:number;side:number}
export function CityJoystick({active,onMove}:{active:boolean;onMove:(value:Vector)=>void}){
 const [thumb,setThumb]=useState({x:0,y:0}),pointer=useRef<number|null>(null),callback=useRef(onMove);callback.current=onMove
 function stop(){pointer.current=null;setThumb({x:0,y:0});callback.current({forward:0,side:0})}
 useEffect(()=>{if(!active)stop()},[active])
 useEffect(()=>{const reset=()=>stop();window.addEventListener('blur',reset);window.addEventListener('city-stop-walking',reset);document.addEventListener('visibilitychange',reset);return()=>{callback.current({forward:0,side:0});window.removeEventListener('blur',reset);window.removeEventListener('city-stop-walking',reset);document.removeEventListener('visibilitychange',reset)}},[])
 function move(e:PointerEvent<HTMLDivElement>){if(pointer.current!==e.pointerId)return;const r=e.currentTarget.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.max(32,Math.hypot(dx,dy)),x=dx/length,y=dy/length;setThumb({x:x*24,y:y*24});callback.current({forward:Math.abs(y)<.12?0:-y,side:Math.abs(x)<.12?0:x})}
 return <div className="city-joystick" role="group" aria-label="아바타 이동 조이스틱" onPointerDown={e=>{if(!active||pointer.current!==null)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture?.(e.pointerId);move(e)}} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onPointerLeave={stop}><span aria-hidden="true" style={{transform:`translate(${thumb.x}px,${thumb.y}px)`}}/><small>이동</small></div>
}
