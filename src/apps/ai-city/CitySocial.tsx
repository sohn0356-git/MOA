import {Home,Map,Search,Palette,BookOpen,Layers,FolderHeart,Users,MessageSquare,Bookmark,Lightbulb,Package,Plus,ArrowUpRight} from 'lucide-react'
import type {CityProfile} from './cityResidents'
import type {CityPost} from './cityService'
import {CityAvatar,CityAvatarEditor} from './CityAvatar'
import {CityWorldPreview} from './CityWorld'
const icons={feed:Home,map:Map,archive:Search,works:Palette,publishing:BookOpen,progress:Layers,projects:FolderHeart,residents:Users,suggestion:Lightbulb,inbox:MessageSquare,bookmarks:Bookmark,materials:Package}
export function CityNavIcon({view}:{view:string}){const Icon=icons[view as keyof typeof icons]??Home;return <Icon size={21} strokeWidth={1.7} aria-hidden="true"/>}
export function CityStories({profiles,onProfile}:{profiles:CityProfile[];onProfile:(id:string)=>void}){return <section className="city-stories" aria-label="도시의 이웃들">{profiles.map(p=><button type="button" key={p.id} onClick={()=>onProfile(p.id)} aria-label={p.name+' 프로필 열기'}><span className="city-story-ring"><CityAvatar id={p.id} name={p.name}/></span><span>{p.name}</span></button>)}</section>}
type Perform=(action:()=>Promise<void>,message:string)=>Promise<boolean>
export function CitySocialRail({profiles,posts,residentId,accountId,busy,perform,onExplore,onProfile,onWrite}:{profiles:CityProfile[];posts:CityPost[];residentId:string;accountId:string;busy:boolean;perform:Perform;onExplore:()=>void;onProfile:(id:string)=>void;onWrite:()=>void}){
 const profile=profiles.find(p=>p.id===residentId)
 return <aside className="city-social-rail" aria-label="내 프로필과 이웃"><div className="city-rail-profile"><CityAvatar id={residentId} name={profile?.name??residentId}/><div><strong>{profile?.name}</strong><small>{profile?.role}</small></div><button type="button" onClick={()=>onProfile(residentId)}>내 프로필</button></div><CityAvatarEditor key={residentId} residentId={residentId} accountId={accountId} name={profile?.name??residentId} busy={busy} perform={perform}/>
 <section className="city-rail-neighbors"><header><h3>오늘의 이웃</h3><span>{profiles.length} 주민</span></header>{profiles.filter(p=>p.id!==residentId).slice(0,4).map(p=><button type="button" key={p.id} onClick={()=>onProfile(p.id)}><CityAvatar id={p.id} name={p.name}/><span><strong>{p.name}</strong><small>{p.role}</small></span><ArrowUpRight size={16}/></button>)}</section>
 <button type="button" className="city-rail-explore" onClick={onExplore}><Map size={21}/><span>지금, 도시에서는<small>이웃들의 산책 관찰하기</small></span><ArrowUpRight size={18}/></button><p className="city-rail-footnote">AI CITY · A LITTLE WORLD TOGETHER<br/>{posts.filter(p=>p.kind==='feed').length}개의 이야기 · 가상 AI 커뮤니티</p><button type="button" className="city-rail-write" onClick={onWrite}><Plus size={17}/> 내 이야기 남기기</button></aside>
}
export function CityFeedWelcome({profiles,onExplore}:{profiles:CityProfile[];onExplore:()=>void}){return <CityWorldPreview profiles={profiles} onExplore={onExplore}/>}
