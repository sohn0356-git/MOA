import { useId, useRef } from 'react'
import { SanctuaryJoystick } from './SanctuaryJoystick'
import type {AvatarPose,AvatarProfile,RoomPresence} from './sanctuaryCommunity'
import { PixelAvatar } from './PixelAvatar'
import { useSanctuaryMovement } from './useSanctuaryMovement'
import { floorPointFromScene, projectSanctuaryPoint, sanctuaryBenchDepth, sanctuaryBenches, sanctuarySeats, sanctuarySeatPoints, sanctuaryPrayerBoxPoint, sanctuarySpawn, type FloorPoint } from './sanctuaryMovement'
import './PixelAvatar.css'
export function SanctuaryScene({ seat, onSeat, candle = false, initialPosition = sanctuarySpawn, onPosition, onMotion, profile, peers=[], onPrayerBox, prayerCount=0 }: {
 seat:number; onSeat?:(seat:number)=>void; candle?:boolean; initialPosition?:FloorPoint; onPosition?:(point:FloorPoint,facing:number)=>void; onMotion?:(point:FloorPoint,facing:number,moving:boolean,pose?:AvatarPose)=>void; onPrayerBox?:()=>void; prayerCount?:number; profile?:AvatarProfile; peers?:RoomPresence[]
}) {
 const id=useId().replace(/:/g,'')
 const svg=useRef<SVGSVGElement>(null)
 const walk=useSanctuaryMovement(initialPosition,onPosition,onMotion)
 const screen=projectSanctuaryPoint(walk.position)
 const mailbox=projectSanctuaryPoint({x:.975,z:.16})
 const occupied=(index:number)=>peers.some(peer=>peer.pose==='sitting'&&Math.hypot(peer.x-sanctuarySeatPoints[index].x,peer.z-sanctuarySeatPoints[index].z)<.1)
 function sitNearest(){
  const choices=sanctuarySeatPoints.map((p,index)=>({index,distance:Math.hypot(p.x-walk.position.x,p.z-walk.position.z)})).filter(p=>!occupied(p.index)).sort((a,b)=>a.distance-b.distance)
  const next=choices[0];if(next){onSeat?.(next.index);walk.goTo(sanctuarySeatPoints[next.index],true,undefined,180)}
 }
 return <div className="sanctuary-interactive" role={onSeat?'group':undefined} aria-label={onSeat?'아바타 이동이 가능한 예배당':undefined} tabIndex={onSeat?0:undefined}
  onKeyDown={event=>{if(onSeat&&walk.keyDown(event.key))event.preventDefault()}}
  onKeyUp={event=>{if(onSeat&&walk.keyUp(event.key))event.preventDefault()}}
  onBlur={event=>{if(onSeat&&!event.currentTarget.contains(event.relatedTarget as Node|null))walk.releaseInput()}}>
  <div className="sanctuary-room" onClick={event=>{
   if(!onSeat||!svg.current||(event.target as Element).closest('button'))return
   const matrix=svg.current.getScreenCTM();if(!matrix)return
   const point=svg.current.createSVGPoint();point.x=event.clientX;point.y=event.clientY
   const local=point.matrixTransform(matrix.inverse()),target=floorPointFromScene(local.x,local.y)
   if(target){event.currentTarget.parentElement?.focus({preventScroll:true});walk.goTo(target)}
  }}>
  <svg ref={svg} className="sanctuary-room-art" viewBox="0 0 640 480" role="img" aria-label="아치 창으로 빛이 들어오는 조용한 예배당">
   <defs>
    <linearGradient id={id+'wall'} x2="0" y2="1"><stop stopColor="var(--room-wall-top)"/><stop offset="1" stopColor="var(--room-wall)"/></linearGradient>
    <linearGradient id={id+'glass'} x2="0" y2="1"><stop stopColor="var(--room-window-top)"/><stop offset="1" stopColor="var(--room-window)"/></linearGradient>
    <linearGradient id={id+'floor'} x2="0" y2="1"><stop stopColor="var(--room-floor-top)"/><stop offset="1" stopColor="var(--room-floor)"/></linearGradient>
    <radialGradient id={id+'glow'}><stop stopColor="#ffe9ac" stopOpacity=".65"/><stop offset="1" stopColor="#ffe9ac" stopOpacity="0"/></radialGradient>
   </defs>
   <path d="M0 0H640V480H0Z" fill={'url(#'+id+'wall)'}/>
   <path d="M0 0L137 94V270L0 480Z" fill="var(--room-side)"/><path d="M640 0L503 94V270L640 480Z" fill="var(--room-side)"/>
   <path d="M137 270H503L640 480H0Z" fill={'url(#'+id+'floor)'}/>
   <path d="M137 94L320 4L503 94" fill="none" stroke="var(--room-trim)" strokeWidth="7"/>
   <path d="M183 113L320 45L457 113" fill="none" stroke="var(--room-trim)" strokeWidth="3" opacity=".45"/>
   <path d="M260 222V119Q320 32 380 119V222Z" fill="var(--room-trim)"/>
   <path d="M272 216V123Q320 49 368 123V216Z" fill={'url(#'+id+'glass)'}/>
   <path d="M320 83V215M274 154H366" stroke="var(--room-trim)" strokeWidth="4" opacity=".55"/>
   <path d="M298 113H342M320 96V181" stroke="#fff3c6" strokeWidth="7" strokeLinecap="square"/>
   <ellipse cx="320" cy="241" rx="164" ry="134" fill={'url(#'+id+'glow)'}/>
   <path d="M279 205L210 465H430L361 205" fill="#fff4c1" opacity=".12"/>
   <path d="M280 273L202 480H438L360 273" fill="var(--room-aisle)" opacity=".65"/>
   <path d="M276 252H364V276H276Z" fill="var(--room-wood)"/><path d="M269 245H371V255H269Z" fill="var(--room-trim)"/>
   <path d="M308 230H332V245H308Z" fill="#c9b887"/><path d="M306 229H334" stroke="#f7e7bd" strokeWidth="3"/>
   {[...sanctuaryBenches].sort((a,b)=>a.point.z-b.point.z).map(({label,point})=>{
    const side=Math.sign(point.x)
    const near=projectSanctuaryPoint({x:side*.37,z:point.z})
    const outer=projectSanctuaryPoint({x:side*.89,z:point.z})
    const far=projectSanctuaryPoint({x:side*.37,z:point.z-sanctuaryBenchDepth})
    const farOuter=projectSanctuaryPoint({x:side*.89,z:point.z-sanctuaryBenchDepth})
    return <g key={label}>
     <path d={`M${near.x} ${near.y}H${outer.x}v7H${near.x}Z`} fill="var(--room-wood)"/>
     <path d={`M${near.x} ${near.y}L${far.x} ${far.y}H${farOuter.x}L${outer.x} ${outer.y}Z`} fill="var(--room-pew-top)"/>
    </g>
   })}
   <path d="M75 126V211M104 143V235M565 126V211M536 143V235" stroke="var(--room-window-top)" strokeWidth="7" opacity=".4"/>
   <path d="M291 275V299M349 275V299" stroke="var(--room-trim)" strokeWidth="4"/>
   {candle && <g className="sanctuary-scene-candle"><ellipse cx="349" cy="261" rx="16" ry="20" fill="#ffcf6a" opacity=".2"/><rect x="346" y="249" width="6" height="15" rx="1" fill="#fff1ce"/><path d="M349 235Q340 247 349 250Q358 247 349 235" fill="#ffc96f"/></g>}
  </svg>
  {onSeat&&onPrayerBox&&<button type="button" className="sanctuary-prayer-box" style={{left:mailbox.x/640*100+'%',top:mailbox.y/480*100+'%'}} aria-label="중보기도함 열기" aria-description={prayerCount>0?`읽지 않은 기도 ${prayerCount}개`:undefined} onClick={event=>{event.stopPropagation();walk.goTo(sanctuaryPrayerBoxPoint,false,onPrayerBox,145)}}>
   <svg viewBox="0 0 64 76" aria-hidden="true"><ellipse cx="34" cy="70" rx="19" ry="4" fill="#3f412222"/><path d="M28 40h9v29h-9z" fill="#9b7950"/><path d="M22 69h22v4H22z" fill="#8b704f"/><path d="M8 14L32 3l25 11v36H8z" fill="#a77d4e"/><path d="M8 14h49v36H8z" fill="#bf9862"/><path d="M5 14L32 1l29 13-3 5-26-12L8 19z" fill="#725b3f"/><path d="M17 23h30v4H17z" fill="#5c513b"/><path d="M20 33h25v13H20z" fill="#fff1ce"/><path d="M24 36l9 6 8-6" fill="none" stroke="#a78c58" strokeWidth="1.5"/><path d="M51 19v26M12 20v25" stroke="#d6b887" opacity=".5"/></svg>
   {prayerCount>0&&<b aria-hidden="true">{prayerCount}</b>}
  </button>}
  {onSeat && sanctuarySeats.map(({label},index)=><button type="button" key={label} className="sanctuary-seat"
   style={{left:projectSanctuaryPoint(sanctuarySeatPoints[index]).x/640*100+'%',top:projectSanctuaryPoint(sanctuarySeatPoints[index]).y/480*100+'%'}}
   aria-label={label+' 자리 선택'} disabled={occupied(index)} title={occupied(index)?label+' · 사용 중':label+'에 가서 앉기'} aria-pressed={seat===index} onClick={event=>{event.stopPropagation();onSeat(index);walk.goTo(sanctuarySeatPoints[index],true,undefined,180)}}>
   <span aria-hidden="true"/>
  </button>)}
  {onSeat&&<div className="sanctuary-avatar-anchor" data-avatar-x={walk.position.x.toFixed(3)} data-avatar-z={walk.position.z.toFixed(3)}
    style={{left:screen.x/640*100+'%',top:screen.y/480*100+'%',zIndex:10+Math.round(walk.position.z*100)}}>
    <PixelAvatar pose={walk.pose} profile={profile} facing={walk.facing} moving={walk.moving} seated={walk.seated} scale={.55+walk.position.z*.35}/>
  </div>}
  {onSeat&&peers.map(peer=>{const p=projectSanctuaryPoint(peer);return <div key={peer.uid} className="sanctuary-avatar-anchor sanctuary-peer" data-peer-uid={peer.uid} style={{left:p.x/640*100+'%',top:p.y/480*100+'%',zIndex:10+Math.round(peer.z*100)}}>
   <span className="sanctuary-avatar-name">{peer.name}</span><PixelAvatar pose={peer.pose} profile={peer} facing={peer.facing} moving={peer.moving} seated={false} scale={.55+peer.z*.35} label={peer.name+'의 아바타'}/>
  </div>})}
  </div>
  {onSeat&&<div className="sanctuary-walk-controls sanctuary-compact-controls"><SanctuaryJoystick onVector={walk.joystick}/>
   <div className="sanctuary-posture-tools"><div className="sanctuary-postures" role="group" aria-label="기도 자세">
    {([{id:'standing',label:'서기',path:'M12 8v8m-4-5 4-3 4 3m-4 5-4 5m4-5 4 5'},{id:'sitting',label:'앉아 기도',path:'M10 8v7h7v6m-7-10 5 2m-9-2v7h10'},{id:'kneeling',label:'무릎 기도',path:'M10 8l3 6-3 5h8m-7-8 5 1 1-3'}] as const).map(p=><button key={p.id} type="button" aria-pressed={walk.pose===p.id} onClick={()=>{if(p.id==='sitting')sitNearest();else walk.setPosture(p.id)}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx={p.id==='kneeling'?11:12} cy="4" r="2" fill="currentColor"/><path d={p.path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{p.label}</span></button>)}
   </div><small>{walk.blocked?'통로를 찾지 못했어요. 다른 곳을 눌러주세요.':walk.destination?'통로를 따라 걸어가고 있어요':walk.pose==='sitting'?'의자에 앉아서 기도하고 있어요':walk.pose==='kneeling'?'무릎 꿇고 기도하고 있어요':'빈 자리를 누르면 가서 앉아요'}</small></div>
  </div>}
 </div>
}
