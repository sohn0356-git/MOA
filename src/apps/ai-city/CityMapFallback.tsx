import {cityBuildings,type CityBuilding} from './cityBuildings'
export function CityMapFallback({onEnter}:{onEnter:(building:CityBuilding)=>void}){
 return <svg className="city-map-fallback" viewBox="0 0 1200 800" role="group" aria-label="AI City 2D 도시 지도">
 <rect width="1200" height="800" rx="24" fill="#e1ead8"/>
 <path d="M0 105 Q300 65 600 100 T1200 90" fill="none" stroke="#a6d2d5" strokeWidth="42"/>
 <path d="M100 370H1070M290 240H850M290 580H1070M570 160V690M100 150V650M1060 150V650M290 240V580M850 240V580" fill="none" stroke="#f7edd9" strokeWidth="30"/>
 {cityBuildings.map(b=><g key={b.id} role="button" tabIndex={0} aria-label={b.name+' · '+b.label+' 열기'} onClick={()=>onEnter(b)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onEnter(b)}}}>
 <rect x={b.x-67} y={b.z-40} width="134" height="80" rx="16" fill={b.color} stroke="#fff" strokeWidth="4"/>
 <text x={b.x} y={b.z-3} textAnchor="middle" fontSize="17" fill="#302d32">{b.name}</text><text x={b.x} y={b.z+23} textAnchor="middle" fontSize="15" fill="#302d32">{b.label} ↗</text>
 </g>)}
 </svg>
}
