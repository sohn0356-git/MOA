import {useState} from 'react'
import {cityBuildings,type CityBuilding} from './cityBuildings'
import type {CityPost,CityWork} from './cityService'
import type {CityProfile} from './cityResidents'
import {CityImageView} from './CityImage'
import './CityArrival.css'
export function CityArrival({posts=[],works=[],profiles,ready=false,residentId,onEnter,onOpen}:{posts?:CityPost[];works?:CityWork[];profiles:CityProfile[];ready?:boolean;residentId:string;onEnter:(b:CityBuilding)=>void;onOpen?:(id:string)=>void}){
 const [open,setOpen]=useState(false)
 const [place,setPlace]=useState('studio'),building=cityBuildings.find(b=>b.id===place)??cityBuildings[0]
 const activityTime=(p:CityPost)=>place==='studio'?(works.find(w=>w.sourcePostId===p.id)?.updatedAt??p.createdAt):p.createdAt
 const scope=place==='studio'?'작품집에 등록된 작업':place==='hall'?'도시 건의소의 제안':place==='home'?'선택한 주민의 게시 기록':'도시 전체의 최근 기록 · 이 장소 안의 활동으로 분류하지 않음'
 const matches=posts.filter(p=>place==='hall'?p.kind==='suggestion':place==='studio'?works.some(w=>w.sourcePostId===p.id):place==='home'?(p.residentId??p.accountId)===residentId:p.kind==='feed').sort((a,b)=>activityTime(b)-activityTime(a)).slice(0,3)
 return <details className="city-arrival" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary><span>도시 안내</span><strong>누가, 무엇을 만들고 있나요?</strong><span>장소와 최근 기록 보기 ↗</span></summary>{open?<div className="city-arrival-content"><header><div><p className="city-social-kicker">PLACES & PEOPLE</p><h3>관심 있는 작업부터 들어가세요.</h3><p>실제로 저장된 작업과 기록입니다. 접속 중인 주민이나 활동 장소를 추정하지 않습니다.</p></div><label>최근 활동을 볼 장소<select aria-label="최근 활동을 볼 장소" value={place} onChange={e=>setPlace(e.target.value)}>{cityBuildings.map(b=><option value={b.id} key={b.id}>{b.name} · {b.label}</option>)}</select></label></header>
 <div className="city-arrival-path"><strong>{building.name}</strong><span>{building.label}을 여는 곳</span><button type="button" onClick={()=>onEnter(building)}>{building.label} 보러 입장</button></div>
 <p className="city-arrival-scope">{scope}</p>
 {!ready?<p role="status">최근 기록을 확인하는 중…</p>:matches.length?<div className="city-arrival-records">{matches.map(post=>{const work=works.find(w=>w.sourcePostId===post.id),author=profiles.find(p=>p.id===(post.residentId??post.accountId));return <article key={post.id}><p className="city-arrival-author">{author?.name??post.residentId??post.accountId} <span>{place==='studio'?'작품 갱신 ':'게시 '}{new Date(activityTime(post)).toLocaleString('ko-KR')}</span></p><h4>{work?.title??post.suggestion?.title??post.body.split('\n')[0].slice(0,100)}</h4><p className="city-arrival-stage">{work?(work.status==='finished'?'완료한 작품':'구상 중인 작품'):post.kind==='suggestion'?'도시를 위한 제안':'주민이 남긴 기록'}</p>{post.image?<CityImageView image={post.image}/>:<p className="city-arrival-no-image">첨부 그림 없음 · 글로 읽는 작업</p>}<button type="button" disabled={!onOpen} onClick={()=>onOpen?.(post.id)}>작성자가 남긴 원문 읽기 ↗</button></article>})}</div>:<p>이 범위에 확인된 최근 기록이 없습니다. 기존 기능은 바로 열 수 있습니다.</p>}
 </div>:null}</details>
}
