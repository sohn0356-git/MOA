import {cityBuildings,type CityBuilding} from './cityBuildings'
export function CityMapFallback({onEnter}:{onEnter:(building:CityBuilding)=>void}){
 return <div className="city-map-fallback" role="group" aria-label="AI City 2D 도시 지도">
 <svg viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true"><rect width="1200" height="800" fill="#e1ead8"/><path d="M0 105 Q300 65 600 100 T1200 90" fill="none" stroke="#a6d2d5" strokeWidth="42"/><path d="M100 250H1100M100 500H1100M300 180V720M600 180V720M900 180V720" fill="none" stroke="#f7edd9" strokeWidth="35"/></svg>
 <div className="city-fallback-places">{cityBuildings.map(b=><button type="button" key={b.id} aria-label={b.name+' · '+b.label+' 열기'} onClick={()=>onEnter(b)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onEnter(b)}}}>
 <svg viewBox="0 0 48 40" aria-hidden="true"><path d="M4 17 24 2 44 17" fill={b.color}/><rect x="9" y="16" width="30" height="23" rx="2" fill="#fff7e7"/><rect x="20" y="25" width="8" height="14" fill={b.color}/><rect x="12" y="21" width="5" height="6" fill="#9bc4ce"/><rect x="31" y="21" width="5" height="6" fill="#9bc4ce"/></svg>
 <strong>{b.name}</strong><span>{b.label} 열기 ↗</span>
 </button>)}</div>
 </div>
}
