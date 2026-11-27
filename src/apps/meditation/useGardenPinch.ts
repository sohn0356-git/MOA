import {useEffect,useLayoutEffect,useRef,useState,type RefObject,type MouseEvent} from 'react'
type Pinch={distance:number;zoom:number;worldX:number;worldY:number}
export function useGardenPinch(viewportRef:RefObject<HTMLDivElement|null>){
 const [zoom,setZoom]=useState(1),current=useRef(1),pinch=useRef<Pinch|null>(null),pending=useRef<{x:number;y:number}|null>(null),suppressUntil=useRef(0)
 useLayoutEffect(()=>{const node=viewportRef.current,scroll=pending.current;if(node&&scroll){node.scrollLeft=scroll.x;node.scrollTop=scroll.y;pending.current=null}},[zoom,viewportRef])
 useEffect(()=>{
  const node=viewportRef.current;if(!node)return
  const geometry=(touches:TouchList)=>{const [a,b]=Array.from(touches),rect=node.getBoundingClientRect();return{distance:Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY),x:(a.clientX+b.clientX)/2-rect.left,y:(a.clientY+b.clientY)/2-rect.top}}
  const start=(event:TouchEvent)=>{if(event.touches.length!==2){pinch.current=null;return}event.preventDefault();const p=geometry(event.touches);if(p.distance<1)return;pinch.current={distance:p.distance,zoom:current.current,worldX:(node.scrollLeft+p.x)/current.current,worldY:(node.scrollTop+p.y)/current.current};suppressUntil.current=Date.now()+600}
  const move=(event:TouchEvent)=>{const initial=pinch.current;if(!initial||event.touches.length!==2)return;event.preventDefault();const p=geometry(event.touches),next=Math.max(1,Math.min(2,initial.zoom*p.distance/initial.distance));const scroll={x:initial.worldX*next-p.x,y:initial.worldY*next-p.y};suppressUntil.current=Date.now()+600;if(next===current.current){node.scrollLeft=scroll.x;node.scrollTop=scroll.y}else{pending.current=scroll;current.current=next;setZoom(next)}}
  const end=(event:TouchEvent)=>{if(pinch.current)suppressUntil.current=Date.now()+600;if(event.type==='touchcancel'||event.touches.length!==2)pinch.current=null}
  node.addEventListener('touchstart',start,{passive:false});node.addEventListener('touchmove',move,{passive:false});node.addEventListener('touchend',end);node.addEventListener('touchcancel',end)
  return()=>{node.removeEventListener('touchstart',start);node.removeEventListener('touchmove',move);node.removeEventListener('touchend',end);node.removeEventListener('touchcancel',end);pinch.current=null}
 },[viewportRef])
 function onClickCapture(event:MouseEvent){if(Date.now()<suppressUntil.current){event.preventDefault();event.stopPropagation()}}
 return{zoom,onClickCapture}
}
