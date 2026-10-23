import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {avatarColors,defaultAvatar,type CityAvatarLook,type CityWorldCommand} from './cityWorld'
import {watchWorldAvatars,watchWorldCommands,saveWorldAvatar,type StoredCityAvatar} from './cityWorldService'
const WorldContext=createContext<{avatars:Record<string,StoredCityAvatar>;commands:Record<string,CityWorldCommand>;failed:boolean;ready:boolean;retry:()=>void}>({avatars:{},commands:{},failed:false,ready:false,retry:()=>{}})
export function CityWorldProvider({children}:{children:ReactNode}){
 const [avatars,setAvatars]=useState<Record<string,StoredCityAvatar>>({}),[commands,setCommands]=useState<Record<string,CityWorldCommand>>({}),[failed,setFailed]=useState(false),[avatarReady,setAvatarReady]=useState(false),[commandReady,setCommandReady]=useState(false),[attempt,setAttempt]=useState(0)
 useEffect(()=>{setFailed(false);setAvatarReady(false);setCommandReady(false);const stops:Array<()=>void>=[];try{stops.push(watchWorldAvatars(v=>{setAvatars(v);setAvatarReady(true)},()=>setFailed(true)));stops.push(watchWorldCommands(v=>{setCommands(v);setCommandReady(true)},()=>setFailed(true)))}catch{setFailed(true)}return()=>stops.forEach(stop=>stop())},[attempt])
 return <WorldContext.Provider value={{avatars,commands,failed,ready:avatarReady&&commandReady,retry:()=>setAttempt(n=>n+1)}}>{children}</WorldContext.Provider>
}
export function useCityWorld(){return useContext(WorldContext)}
export function AvatarFigure({look,full=false}:{look:CityAvatarLook;full?:boolean}){
 const skin=avatarColors.skin[look.skin],hair=avatarColors.hair[look.hair],shirt=avatarColors.shirt[look.shirt]
 return <svg viewBox={full?'0 0 80 112':'0 0 80 80'} aria-hidden="true" focusable="false" className={'city-avatar-art'+(full?' is-full':'')}>
 {full?<><ellipse cx="40" cy="106" rx="19" ry="4" fill="#25394a" opacity=".16"/><path d="M29 77L28 101H38L40 82L43 101H53L51 77" fill="#384257"/><path d="M27 100H38V106H24Q21 103 27 100M43 100H53L57 106H43" fill="#293044"/></>:null}
 <path d="M13 83Q13 57 40 56Q67 57 67 83" fill={shirt}/>{full?<><path d="M17 67L13 87M63 67L67 87" stroke={skin} strokeWidth="8" strokeLinecap="round"/></>:null}
 <path d="M34 51V61Q40 66 46 61V51" fill={skin}/>
 {look.style==='bob'?<path d="M17 37Q15 8 40 8Q66 8 64 57H17" fill={hair}/>:<ellipse cx="40" cy="33" rx="24" ry="26" fill={hair}/>}
 <ellipse cx="40" cy="37" rx="19" ry="23" fill={skin}/><path d="M20 31Q17 10 40 10Q63 10 60 30Q48 27 44 20Q36 31 20 31" fill={hair}/>
 {look.style==='curly'?<g fill={hair}>{[20,29,39,49,59].map((x,i)=><circle key={x} cx={x} cy={17+(i%2)*5} r="9"/>)}</g>:null}
 <circle cx="33" cy="37" r="1.8" fill="#29232a"/><circle cx="48" cy="37" r="1.8" fill="#29232a"/><path d="M36 48Q40 51 45 47" fill="none" stroke="#9b564f" strokeWidth="1.7" strokeLinecap="round"/>
 {look.accessory==='glasses'?<g fill="none" stroke="#333347" strokeWidth="2"><rect x="25" y="32" width="14" height="11" rx="4"/><rect x="43" y="32" width="14" height="11" rx="4"/><path d="M39 36H43"/></g>:null}
 {look.accessory==='cap'?<path d="M16 24Q20 2 43 5Q61 7 62 24ZM43 24H71Q73 30 61 29H43" fill={shirt}/>:null}
 </svg>
}
export function CityAvatar({id,name,full=false}:{id:string;name:string;full?:boolean}){const {avatars}=useCityWorld();return <span className={'city-avatar'+(full?' city-avatar-full':'')} role="img" aria-label={name+' 아바타'}><AvatarFigure look={avatars[id]??defaultAvatar(id)} full={full}/></span>}
type Perform=(action:()=>Promise<void>,message:string)=>Promise<boolean>
export function CityAvatarEditor({residentId,accountId,name,busy,perform}:{residentId:string;accountId:string;name:string;busy:boolean;perform:Perform}){
 const {avatars,failed,ready,retry}=useCityWorld(),saved=avatars[residentId]??defaultAvatar(residentId)
 const [draft,setDraft]=useState<CityAvatarLook>(()=>({...saved})),[editing,setEditing]=useState(false)
 useEffect(()=>{setEditing(false);setDraft({...saved})},[residentId])
 const look=editing?draft:saved
 function change(change:Partial<CityAvatarLook>){setDraft(v=>({...v,...change}))}
 return <section className="city-avatar-editor" aria-label="아바타 꾸미기"><header><div><small>MY CHARACTER</small><h3>{name}의 아바타</h3></div><span className="city-avatar-diamond" aria-hidden="true">◆</span></header><div className="city-avatar-stage"><AvatarFigure look={look} full/><span>나만의 도시, 나만의 모습.</span></div>
 {failed?<p role="alert">아바타 연결을 확인하지 못했습니다. 기본 모습 또는 이전 확인 모습입니다. <button type="button" onClick={retry}>다시 연결</button></p>:null}
 {!editing?<button type="button" className="city-social-primary" disabled={!ready||failed||busy} onClick={()=>{setDraft({...saved});setEditing(true)}}>아바타 만들기 · 수정</button>:<form onSubmit={async e=>{e.preventDefault();const value={skin:draft.skin,hair:draft.hair,shirt:draft.shirt,style:draft.style,accessory:draft.accessory};if(await perform(()=>saveWorldAvatar(accountId,residentId,value),'아바타를 저장했습니다. 피드와 도시 지도에 함께 반영됩니다.'))setEditing(false)}}>
 {(['skin','hair','shirt'] as const).map((field,i)=><fieldset key={field}><legend>{['피부색','머리색','의상 색'][i]}</legend><div className="city-avatar-swatches">{avatarColors[field].map((color,index)=><button key={color} type="button" aria-label={['피부색','머리색','의상 색'][i]+' '+(index+1)} aria-pressed={draft[field]===index} style={{backgroundColor:color}} onClick={()=>change({[field]:index})} disabled={busy}/>)}</div></fieldset>)}
 <label>헤어스타일<select value={draft.style} disabled={busy} onChange={e=>change({style:e.target.value as CityAvatarLook['style']})}><option value="short">숏 헤어</option><option value="bob">단발</option><option value="curly">곱슬머리</option></select></label><label>액세서리<select value={draft.accessory} disabled={busy} onChange={e=>change({accessory:e.target.value as CityAvatarLook['accessory']})}><option value="none">없음</option><option value="glasses">안경</option><option value="cap">모자</option></select></label>
 <div className="city-social-actions"><button type="button" disabled={busy} onClick={()=>change({skin:Math.floor(Math.random()*5),hair:Math.floor(Math.random()*6),shirt:Math.floor(Math.random()*6)})}>랜덤 색상</button><button type="submit" disabled={busy||failed||!ready} className="city-social-primary">{busy?'저장 중…':'아바타 저장'}</button><button type="button" disabled={busy} onClick={()=>setEditing(false)}>취소</button></div></form>}</section>
}
