import {useState} from 'react'
import {PixelAvatar} from './PixelAvatar'
import {avatarSkins,avatarHairs,avatarShirts,type AvatarProfile,type SharedPrayer} from './sanctuaryCommunity'
import type {SanctuaryCommunity} from './useSanctuaryCommunity'
export function SanctuaryCommunityPanel({room,uid}:{room:SanctuaryCommunity;uid:string}){
 const [editing,setEditing]=useState(false),[avatar,setAvatar]=useState<AvatarProfile>(room.profile),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const draftKey='moa.faith.shared-prayer-draft:'+encodeURIComponent(uid)
 const [draft,setDraft]=useState<{title:string;body:string;id?:string}>(()=>{try{const p=JSON.parse(localStorage.getItem(draftKey)||'{}');return{title:typeof p.title==='string'?p.title:'',body:typeof p.body==='string'?p.body:'',id:typeof p.id==='string'?p.id:undefined}}catch{return{title:'',body:''}}})
 function writeDraft(next:typeof draft){setDraft(next);try{localStorage.setItem(draftKey,JSON.stringify(next))}catch{setMessage('초안을 저장하지 못했습니다. 내용을 복사해두세요.')}}
 async function action(fn:()=>Promise<unknown>,success='저장했습니다.'){if(busy)return;setBusy(true);setMessage('');try{await fn();setMessage(success)}catch(error){setMessage(error instanceof Error?error.message:'연결을 확인하고 다시 시도해주세요.')}finally{setBusy(false)}}
 function editPrayer(p:SharedPrayer){writeDraft({id:p.id,title:p.title,body:p.body})}
 return <div className="sanctuary-community">
  <section className="sanctuary-community-card sanctuary-together" aria-label="예배당 접속 현황">
   <div className="sanctuary-community-heading"><div><small>TOGETHER IN PRAYER</small><h3>함께 머무는 예배당</h3></div><span className={'sanctuary-live '+(room.connected?'is-online':'')}>{room.connected?'실시간 연결':'연결 확인 중'}</span></div>
   <div className="sanctuary-community-stats"><div><strong>{room.connected?room.online:'—'}</strong><span>지금 예배당에</span></div><div><strong>{room.visitors??'—'}</strong><span>오늘 방문한 사람 · 한국 시간</span></div></div>
   <div className="sanctuary-people">{room.connected&&<span>나 · {room.profile.name}</span>}{room.peers.map(p=><span key={p.uid}>{p.name}</span>)}</div>
   <p className="sanctuary-community-hint">접속 인원은 계정당 한 명으로 집계됩니다. 예배당을 떠나면 실시간 표시에서 빠집니다.</p>
   {room.error&&<p className="sanctuary-community-error">{room.error}</p>}
  </section>
  <section className="sanctuary-community-card" aria-label="나의 캐릭터">
   <div className="sanctuary-community-heading"><div><small>MY LITTLE SELF</small><h3>{room.created?'나의 캐릭터':'나만의 캐릭터를 만들어보세요'}</h3></div><button type="button" onClick={()=>{setAvatar(room.profile);setEditing(!editing)}}>{editing?'닫기':room.created?'캐릭터 수정':'캐릭터 만들기'}</button></div>
   {editing&&<form className="sanctuary-avatar-editor" onSubmit={event=>{event.preventDefault();void action(async()=>{await room.saveProfile(avatar);setEditing(false)},'캐릭터를 저장했습니다.')}}>
    <div className="sanctuary-avatar-preview"><PixelAvatar profile={avatar} facing={-25} moving={false} seated={false} scale={1.25}/></div>
    <label>캐릭터 이름<input aria-label="캐릭터 이름" value={avatar.name} maxLength={24} required disabled={busy} onChange={e=>setAvatar({...avatar,name:e.target.value})}/></label>
    {([['skin','피부',avatarSkins],['hair','머리',avatarHairs],['shirt','옷',avatarShirts]] as const).map(([key,label,colors])=><fieldset key={key} disabled={busy}><legend>{label}</legend>{colors.map((color,index)=><button key={color} type="button" aria-label={label+' 색상 '+(index+1)} aria-pressed={avatar[key]===index} style={{background:color}} onClick={()=>setAvatar({...avatar,[key]:index})}/>)}</fieldset>)}
    <button className="sanctuary-primary" disabled={busy||!avatar.name.trim()}>캐릭터 저장</button>
   </form>}
  </section>
  <section className="sanctuary-community-card" aria-label="공동 기도제목">
   <div className="sanctuary-community-heading"><div><small>PRAY FOR ONE ANOTHER</small><h3>서로를 위한 기도</h3></div><span>{room.prayers.length}개의 기도</span></div>
   <p className="sanctuary-community-hint">이곳에 올린 제목과 내용은 로그인한 모든 사람에게 공유됩니다. 함께 읽고 중보해 주세요.</p>
   <form className="sanctuary-shared-prayer-form" onSubmit={event=>{event.preventDefault();void action(async()=>{await room.savePrayer(draft.title,draft.body,draft.id);writeDraft({title:'',body:''})},'기도제목을 공유했습니다.')}}>
    <label>기도제목<input aria-label="공동 기도제목" placeholder="함께 기도해 주세요" maxLength={80} required disabled={busy} value={draft.title} onChange={e=>writeDraft({...draft,title:e.target.value})}/></label>
    <label>기도 내용<textarea aria-label="공동 기도 내용" placeholder="중보를 부탁하는 내용을 남겨주세요" maxLength={1500} required disabled={busy} value={draft.body} onChange={e=>writeDraft({...draft,body:e.target.value})}/></label>
    <div><small>이 계정의 작성 초안은 이 기기에 자동 저장됩니다.</small>{draft.id&&<button type="button" disabled={busy} onClick={()=>writeDraft({title:'',body:''})}>수정 취소</button>}<button className="sanctuary-primary" disabled={busy||!room.connected}>{busy?'저장 중…':draft.id?'기도제목 수정':'기도제목 나누기'}</button></div>
   </form>
   {!room.loaded?<p>공동 기도제목을 불러오고 있습니다.</p>:!room.prayers.length?<p className="sanctuary-community-empty">첫 번째 기도제목을 나눠주세요.</p>:<div className="sanctuary-shared-prayers">{room.prayers.map(p=>{
    const prayed=!!room.intercessions[p.id]?.[uid],count=Object.keys(room.intercessions[p.id]||{}).length
    return <article key={p.id} className={'sanctuary-shared-prayer '+(p.answered?'is-answered':'')}><div><span>{p.answered?'감사 · 응답':'함께 중보해 주세요'}</span><small>{p.name}</small></div><h4>{p.title}</h4><p>{p.body}</p>
     <footer><button type="button" disabled={busy||prayed||p.answered||!room.connected} aria-pressed={prayed} onClick={()=>void action(()=>room.pray(p.id),'함께 기도한 마음을 전했습니다.')}>{prayed?'♥ 함께 기도했어요':'♡ 함께 기도했어요'} · {count}</button>
     {p.uid===uid&&<div><button type="button" disabled={busy} onClick={()=>editPrayer(p)}>수정</button><button type="button" disabled={busy} onClick={()=>void action(()=>room.answerPrayer(p))}>{p.answered?'중보 재개':'응답 표시'}</button><button type="button" disabled={busy} onClick={()=>{if(window.confirm('이 기도제목을 삭제할까요?'))void action(()=>room.deletePrayer(p.id),'기도제목을 삭제했습니다.')}}>삭제</button></div>}</footer>
    </article>
   })}</div>}
   <p className="sanctuary-community-hint">최근 공유된 기도제목 100개를 보여드립니다.</p>
  </section>
  {message&&<p className="sanctuary-community-feedback" role="status">{message}</p>}
 </div>
}
