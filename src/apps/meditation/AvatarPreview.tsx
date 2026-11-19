import {useRef,useState} from 'react'
import {PixelAvatar} from './PixelAvatar'
import type {AvatarProfile} from './sanctuaryCommunity'
export function AvatarPreview({profile}:{profile:AvatarProfile}){
 const [angle,setAngle]=useState(335)
 const drag=useRef<{id:number;x:number;angle:number}|null>(null)
 const rotate=(value:number)=>setAngle((value%360+360)%360)
 return <div className="sanctuary-avatar-turntable">
  <div className="sanctuary-avatar-preview" aria-label="캐릭터 회전 미리보기" onPointerDown={e=>{if(e.button!==0)return;drag.current={id:e.pointerId,x:e.clientX,angle};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const start=drag.current;if(start?.id===e.pointerId)rotate(start.angle+(e.clientX-start.x)*1.5)}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}}>
   <PixelAvatar profile={profile} facing={angle} moving={false} seated={false} scale={2}/>
   <span className="sanctuary-turntable-ring" aria-hidden="true"/>
  </div>
  <div className="sanctuary-rotation-controls"><button type="button" aria-label="캐릭터 왼쪽으로 회전" onClick={()=>rotate(angle-45)}>↶</button><input type="range" aria-label="캐릭터 회전 각도" min={0} max={359} value={Math.round(angle)} onChange={e=>rotate(Number(e.target.value))}/><button type="button" aria-label="캐릭터 오른쪽으로 회전" onClick={()=>rotate(angle+45)}>↷</button></div>
  <button type="button" className="sanctuary-rotation-reset" onClick={()=>setAngle(0)}>정면 보기</button>
 </div>
}
