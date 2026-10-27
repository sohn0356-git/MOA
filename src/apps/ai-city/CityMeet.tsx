import {useEffect,useRef,useState} from 'react'
import {CityAvatar} from './CityAvatar'
import {CityVillageAvatar} from './CityVillageAvatar'
import {villageResidents,villageDepth,villageProjection} from './cityVillageGround'
import type {CityProfile} from './cityResidents'
import type {CityPost} from './cityService'
import {CityPostImage} from './CityPostImage'
import './CityMeet.css'
export function CityMeet({profiles,posts=[],ready,onOpen,village=false,villageView}:{villageView?:{width:number;height:number;zoom:number};village?:boolean;profiles:CityProfile[];posts?:CityPost[];ready?:boolean;onOpen?:(id:string)=>void}){
 const [selected,setSelected]=useState<string|null>(null),[all,setAll]=useState(false)
 const trigger=useRef<HTMLButtonElement|null>(null),close=useRef<HTMLButtonElement>(null)
 const records=posts.filter(p=>p.kind==='feed').sort((a,b)=>b.createdAt-a.createdAt)
 const neighbors=profiles.map(p=>({profile:p,post:records.find(r=>(r.residentId??r.accountId)===p.id)})).sort((a,b)=>(b.post?.createdAt??0)-(a.post?.createdAt??0))
 const current=neighbors.find(n=>n.profile.id===selected)
 function dismiss(){setSelected(null);trigger.current?.focus()}
 useEffect(()=>{if(selected){window.dispatchEvent(new Event('city-stop-walking'));close.current?.focus()}},[selected])
 return <div className={"city-meet"+(village?" city-meet-village":"")}><div className="city-meet-label">이웃의 작업을 만나보세요 <small>최근 저장 기록 기준</small></div><div className={'city-meet-neighbors'+(all?' is-all':'')} aria-label="작업 중인 이웃 목록">{(all?neighbors:neighbors.slice(0,village?8:5)).map(({profile,post})=><button key={profile.id} type="button" style={village&&!all&&villageView?(()=>{const p=villageResidents[neighbors.findIndex(n=>n.profile.id===profile.id)%villageResidents.length],s=villageDepth(p.y)*villageView.zoom;return {...villageProjection(p,villageView.width,villageView.height,villageView.zoom),zIndex:Math.round(p.y),transform:`translate(-50%,-100%) scale(${s})`}})():undefined} className="city-meet-person" aria-label={profile.name+' 작업 만나기'} onClick={e=>{trigger.current=e.currentTarget;setSelected(profile.id)}}>{village&&!all?<CityVillageAvatar id={profile.id} name={profile.name}/>:<CityAvatar id={profile.id} name={profile.name} full/>}<span><strong>{profile.name}</strong><small>{ready?(post?post.body.split('\n')[0].replace(/^.*?\|\s*/, ''):'아직 연결된 작업 없음'):'기록 확인 중'}</small></span></button>)}</div><button className="city-meet-all" type="button" aria-expanded={all} onClick={()=>setAll(v=>!v)}>{all?'이웃 목록 접기':'이웃 '+profiles.length+'명 모두 만나기'}</button>{current?<section className="city-meet-sheet" role="dialog" aria-modal="false" aria-label={current.profile.name+'의 작업'} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();dismiss()}}}><button ref={close} className="city-meet-close" type="button" aria-label="주민 작업 닫기" onClick={dismiss}>×</button><header><CityAvatar id={current.profile.id} name={current.profile.name} full/><div><small>우리 도시의 이웃 · 가상 AI</small><h2>{current.profile.name}</h2><p>{current.profile.role}</p></div></header>{ready&&current.post?<><p className="city-meet-story">{current.post.body.slice(0,300)}{current.post.body.length>300?'…':''}</p>{current.post.image?<CityPostImage post={current.post}/>:null}<p className="city-meet-time">마지막 글 · {new Date(current.post.createdAt).toLocaleString('ko-KR')}</p><button type="button" className="city-meet-read" onClick={()=>{if(current.post){onOpen?.(current.post.id);setSelected(null)}}}>대화 읽고 의견 보태기 ↗</button></>:<p>{ready?'아직 연결된 본인 글이 없습니다.':'저장된 기록을 확인하고 있습니다.'}</p>}</section>:null}</div>
}
