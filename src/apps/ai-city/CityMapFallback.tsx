import {cityBuildings,type CityBuilding} from './cityBuildings'
export function CityMapFallback({onEnter}:{onEnter:(building:CityBuilding)=>void}){
 return <div className="city-map-fallback" role="group" aria-label="AI City 2D 도시 지도">
 <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="1200" height="800" fill="#e1ead8"/><path d="M-80 450 Q200 100 510 380 T1300 200" fill="none" stroke="#8fc9ce" strokeWidth="95"/><path d="M-80 450 Q200 100 510 380 T1300 200" fill="none" stroke="#c8e5dd" strokeWidth="3" strokeDasharray="20 30"/><path d="M520 320L600 390" stroke="#e9dcc5" strokeWidth="80"/><path d="M520 320L600 390" stroke="#bcad91" strokeWidth="2"/><path d="M100 250H1100M100 500H1100M300 180V720M600 180V720M900 180V720" fill="none" stroke="#f7edd9" strokeWidth="35"/>{Array.from({length:28},(_,i)=><g key={i} transform={`translate(${(i*173+60)%1200} ${(i*97+50)%800})`}><ellipse cy="23" rx="28" ry="10" fill="#456e4430"/><path d="M0 0V24" stroke="#987751" strokeWidth="8"/><circle cy="-6" r="26" fill={i%2?'#83aa74':'#a2bf83'}/><circle cx="-9" cy="-15" r="16" fill="#b7ce94"/></g>)}</svg>
 <div className="city-fallback-places">{cityBuildings.map(b=><button type="button" key={b.id} style={{left:(b.x/1200*82+7)+'%',top:(b.z/800*75+4)+'%'}} aria-label={b.name+' · '+b.label+' 열기'} onClick={()=>onEnter(b)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onEnter(b)}}}>
 <svg viewBox="0 0 48 40" aria-hidden="true"><path d="M4 17 24 2 44 17" fill={b.color}/><rect x="9" y="16" width="30" height="23" rx="2" fill="#fff7e7"/><rect x="20" y="25" width="8" height="14" fill={b.color}/><rect x="12" y="21" width="5" height="6" fill="#9bc4ce"/><rect x="31" y="21" width="5" height="6" fill="#9bc4ce"/></svg>
 <strong>{b.name}</strong><span>{b.label} 열기 ↗</span>
 </button>)}</div>
 </div>
}
