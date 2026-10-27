import {useState,useRef,useEffect} from 'react'
import {CityMeet} from './CityMeet'
import {CityAvatar} from './CityAvatar'
import {CityJoystick} from './CityJoystick'
import {cityBuildings,type CityBuilding} from './cityBuildings'
import type {CityProfile} from './cityResidents'
import type {CityPost} from './cityService'
import './CityVillage.css'
export function CityVillage({profiles,posts,ready,residentId,onOpen,onEnter}:{profiles:CityProfile[];posts?:CityPost[];ready?:boolean;residentId:string;onOpen?:(id:string)=>void;onEnter:(b:CityBuilding)=>void}){
 const [pos,setPos]=useState({x:50,y:73}),[scale,setScale]=useState(1),[walking,setWalking]=useState(false)
 const step=useRef({forward:0,side:0}),last=useRef(0),frame=useRef(0)
 function stop(){step.current={forward:0,side:0};cancelAnimationFrame(frame.current);setWalking(false)}
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[])
 function walk(v:{forward:number;side:number}){stop();step.current=v;if(!v.forward&&!v.side)return;setWalking(true);last.current=performance.now();const tick=(t:number)=>{const dt=Math.min(.05,(t-last.current)/1000);last.current=t;setPos(p=>({x:Math.max(5,Math.min(95,p.x+step.current.side*dt*14)),y:Math.max(28,Math.min(88,p.y-step.current.forward*dt*14))}));frame.current=requestAnimationFrame(tick)};frame.current=requestAnimationFrame(tick)}
 return <section className="city-village" aria-label="마을 산책" onBlur={stop} onKeyDown={e=>{if(e.target!==e.currentTarget)return;const d:Record<string,[number,number]>={ArrowUp:[0,-2],ArrowDown:[0,2],ArrowLeft:[-2,0],ArrowRight:[2,0]};if(d[e.key]){e.preventDefault();const [x,y]=d[e.key];setPos(p=>({x:Math.max(5,Math.min(95,p.x+x)),y:Math.max(28,Math.min(88,p.y+y))}))}}} tabIndex={0}>
 <div className="city-village-world" style={{transform:`scale(${scale})`}}><div className="city-village-ground"/><div className={'city-village-player'+(walking?' is-walking':'')} style={{left:pos.x+'%',top:pos.y+'%'}}><CityAvatar id={residentId} name="내 산책 캐릭터" full/><span>나의 산책</span></div></div><CityMeet village profiles={profiles} posts={posts} ready={ready} onOpen={onOpen}/>
 <header className="city-village-title"><small>OUR LITTLE NEIGHBOURHOOD</small><h2>오늘은 누구를 만날까요?</h2><p>이웃을 눌러 작업과 이야기를 만나세요</p></header>
 <div className="city-village-camera"><button aria-label="마을 확대" onClick={()=>setScale(s=>Math.min(1.5,s+.1))}>＋</button><button aria-label="마을 축소" onClick={()=>setScale(s=>Math.max(1,s-.1))}>−</button></div>
 <CityJoystick active onMove={walk}/><p className="city-village-note">주민 배치는 산책용 연출 · 실제 위치·접속 표시 아님</p>
 <nav className="city-village-places" aria-label="마을 장소">{cityBuildings.map(b=><button key={b.id} onClick={()=>{stop();onEnter(b)}}>{b.name}<small>{b.label}</small></button>)}</nav>
 </section>
}
