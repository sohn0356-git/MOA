import { useId } from 'react'
import { UserRound } from 'lucide-react'
export const sanctuarySeats = ['앞쪽 왼편','앞쪽 오른편','뒤쪽 왼편','뒤쪽 오른편']
export function SanctuaryScene({ seat, onSeat, candle = false }: { seat:number; onSeat?:(seat:number)=>void; candle?:boolean }) {
 const id=useId().replace(/:/g,'')
 return <div className="sanctuary-room">
  <svg className="sanctuary-room-art" viewBox="0 0 640 480" role="img" aria-label="아치 창으로 빛이 들어오는 조용한 예배당">
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
   {[0,1,2,3,4,5].map(row=><g key={row}>
    <path d={`M${109-row*13} ${279+row*30}H${265-row*3}V${294+row*30}H${109-row*13}Z`} fill="var(--room-wood)"/>
    <path d={`M${109-row*13} ${279+row*30}L${118-row*13} ${271+row*30}H${270-row*3}L${265-row*3} ${279+row*30}Z`} fill="var(--room-pew-top)"/>
    <path d={`M${375+row*3} ${279+row*30}H${531+row*13}V${294+row*30}H${375+row*3}Z`} fill="var(--room-wood)"/>
    <path d={`M${375+row*3} ${279+row*30}L${370+row*3} ${271+row*30}H${522+row*13}L${531+row*13} ${279+row*30}Z`} fill="var(--room-pew-top)"/>
   </g>)}
   <path d="M75 126V211M104 143V235M565 126V211M536 143V235" stroke="var(--room-window-top)" strokeWidth="7" opacity=".4"/>
   <path d="M291 275V299M349 275V299" stroke="var(--room-trim)" strokeWidth="4"/>
   {candle && <g className="sanctuary-scene-candle"><ellipse cx="349" cy="261" rx="16" ry="20" fill="#ffcf6a" opacity=".2"/><rect x="346" y="249" width="6" height="15" rx="1" fill="#fff1ce"/><path d="M349 235Q340 247 349 250Q358 247 349 235" fill="#ffc96f"/></g>}
  </svg>
  {onSeat && sanctuarySeats.map((label,index)=><button type="button" key={label} className={'sanctuary-seat sanctuary-seat-'+index}
   aria-label={label+' 자리 선택'} aria-pressed={seat===index} onClick={()=>onSeat(index)}>
   {seat===index ? <UserRound size={15} aria-hidden="true"/> : <span aria-hidden="true"/>}
  </button>)}
 </div>
}
