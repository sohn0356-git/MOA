import {useRef,useState} from 'react'
export function SanctuaryJoystick({onVector}:{onVector:(x:number,z:number)=>void}){
 const [knob,setKnob]=useState({x:0,y:0}),pointer=useRef<number|null>(null)
 function reset(){pointer.current=null;setKnob({x:0,y:0});onVector(0,0)}
 function move(event:React.PointerEvent<HTMLButtonElement>){
  if(pointer.current!==event.pointerId)return
  const box=event.currentTarget.getBoundingClientRect(),dx=event.clientX-box.left-box.width/2,dy=event.clientY-box.top-box.height/2
  const length=Math.hypot(dx,dy),limit=box.width*.29,scale=length>limit?limit/length:1
  setKnob({x:dx*scale,y:dy*scale})
  if(length<7)onVector(0,0);else onVector(dx*scale/limit,dy*scale/limit)
 }
 return <div className="sanctuary-joystick-wrap"><button type="button" className="sanctuary-joystick" aria-label="아바타 이동 조이스틱" aria-description="누른 채 원하는 방향으로 드래그하세요. 놓으면 멈춥니다."
  onPointerDown={event=>{if(pointer.current!==null)return;pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);move(event)}}
  onPointerMove={move} onPointerUp={event=>{if(pointer.current===event.pointerId)reset()}}
  onPointerCancel={event=>{if(pointer.current===event.pointerId)reset()}} onLostPointerCapture={event=>{if(pointer.current===event.pointerId)reset()}}
  onBlur={reset} onKeyDown={event=>{const v:Record<string,number[]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};if(v[event.key]){event.preventDefault();event.stopPropagation();onVector(v[event.key][0],v[event.key][1])}}}
  onKeyUp={event=>{if(event.key.startsWith('Arrow')){event.stopPropagation();reset()}}}>
   <span className="sanctuary-joystick-cross" aria-hidden="true">✦</span><span className="sanctuary-joystick-knob" aria-hidden="true" style={{transform:'translate('+knob.x+'px,'+knob.y+'px)'}}/>
 </button><small>드래그해서 이동<br/><span>놓으면 멈춰요</span></small></div>
}
