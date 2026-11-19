import {useEffect,useRef,useState} from 'react'
import {sanctuaryCapacity} from './sanctuaryMovement'
import {PixelAvatar} from './PixelAvatar'
import {SanctuaryDialog} from './SanctuaryDialog'
import {BEFORE_APP_UPDATE} from '../../lib/appUpdateProtocol'
import {avatarSkins,avatarHairs,avatarShirts,avatarPants,avatarHairStyles,avatarTopStyles,avatarAccessories,type AvatarProfile,type SharedPrayer} from './sanctuaryCommunity'
import type {SanctuaryCommunity} from './useSanctuaryCommunity'
type Draft={title:string;body:string;id?:string}
export function SanctuaryCommunityPanel({room,uid,boardOpen,onBoardClose,onEnter}:{room:SanctuaryCommunity;uid:string;boardOpen:boolean;onBoardClose:()=>void;onEnter?:()=>void}){
 const [editing,setEditing]=useState(false),[avatar,setAvatar]=useState<AvatarProfile>(room.profile),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [view,setView]=useState<'list'|'read'|'write'>('list'),[selectedId,setSelectedId]=useState(''),[filter,setFilter]=useState<'active'|'answered'|'mine'>('active')
 const lock=useRef(false),unsaved=useRef(false)
 const draftKey='moa.faith.shared-prayer-draft:'+encodeURIComponent(uid)
 const [draft,setDraft]=useState<Draft>(()=>{try{const p=JSON.parse(localStorage.getItem(draftKey)||'{}');return{title:typeof p.title==='string'?p.title:'',body:typeof p.body==='string'?p.body:'',id:typeof p.id==='string'?p.id:undefined}}catch{return{title:'',body:''}}})
 function writeDraft(next:Draft){setDraft(next);try{localStorage.setItem(draftKey,JSON.stringify(next));unsaved.current=false}catch{unsaved.current=true;setMessage('초안을 저장하지 못했습니다. 내용을 복사해두세요.')}}
 useEffect(()=>{
  const guard=(event:Event)=>{if(unsaved.current){event.preventDefault();setMessage('저장되지 않은 공동 기도 초안이 있습니다. 내용을 복사해주세요.')}}
  const unload=(event:BeforeUnloadEvent)=>{if(unsaved.current){event.preventDefault();event.returnValue=''}}
  window.addEventListener(BEFORE_APP_UPDATE,guard);window.addEventListener('moa:before-navigation',guard);window.addEventListener('beforeunload',unload)
  return()=>{window.removeEventListener(BEFORE_APP_UPDATE,guard);window.removeEventListener('moa:before-navigation',guard);window.removeEventListener('beforeunload',unload)}
 },[])
 async function action(fn:()=>Promise<unknown>,success='저장했습니다.'){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('')
  try{await fn();setMessage(success)}catch{setMessage('저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.')}finally{lock.current=false;setBusy(false)}
 }
 useEffect(()=>{if(boardOpen){setView('list');setMessage('')}},[boardOpen])
 function read(p:SharedPrayer){
  setSelectedId(p.id);setView('read');setMessage('')
  void room.markPrayerRead(p).catch(()=>setMessage('읽음 상태를 저장하지 못했습니다. 기도제목을 다시 열어주세요.'))
 }
 const selected=room.prayers.find(p=>p.id===selectedId)
 const visible=room.prayers.filter(p=>filter==='mine'?p.uid===uid:filter==='answered'?p.answered:!p.answered)
 const online=onEnter?room.connected:room.joined
 const counts={active:room.prayers.filter(p=>!p.answered).length,answered:room.prayers.filter(p=>p.answered).length,mine:room.prayers.filter(p=>p.uid===uid).length}
 return <div className="sanctuary-community sanctuary-community-compact">
  <section className="sanctuary-presence-strip" aria-label="예배당 접속 현황">
   <div className="sanctuary-presence-character">
    <PixelAvatar profile={room.profile} facing={-25} moving={false} seated={false} scale={.9} label="내 캐릭터 미리보기"/>
    <span>{room.profile.name}</span>
    <button type="button" className="sanctuary-character-button" onClick={()=>{setAvatar(room.profile);setMessage('');setEditing(true)}}>캐릭터 수정</button>
   </div>
   <div className="sanctuary-presence-stats">
    <span className={'sanctuary-live '+(online?'is-online':'')}>{online?'실시간 연결':'연결 확인 중'}</span>
    <dl>
     <div><dt>현재 입장 인원 / 정원</dt><dd>{room.online??'—'} <small>/ {sanctuaryCapacity}명</small></dd></div>
     <div><dt>오늘 총 입장 인원</dt><dd>{room.visitors===null?'—':room.visitors+'명'}</dd></div>
    </dl>
   </div>
   {onEnter&&<button type="button" className="sanctuary-primary sanctuary-enter" disabled={room.full} onClick={onEnter}>{room.full?'정원 마감':'입장하기'}</button>}
   {room.error&&<p className="sanctuary-community-error">{room.error}</p>}
   {room.peers.length>0&&<p className="sanctuary-people">{room.peers.map(p=><span key={p.uid}>{p.name}</span>)}</p>}
  </section>
  <SanctuaryDialog open={editing} title="나의 캐릭터" onClose={()=>setEditing(false)}>
   <form className="sanctuary-avatar-editor" onSubmit={event=>{event.preventDefault();void action(async()=>{await room.saveProfile(avatar);setEditing(false)},'캐릭터를 저장했습니다.')}}>
    <div className="sanctuary-avatar-preview"><PixelAvatar profile={avatar} facing={-25} moving={false} seated={false} scale={1.25}/></div>
    <label>캐릭터 이름<input aria-label="캐릭터 이름" value={avatar.name} maxLength={24} required disabled={busy} onChange={e=>setAvatar({...avatar,name:e.target.value})}/></label>
    {([['skin','피부',avatarSkins],['hair','머리',avatarHairs],['shirt','옷',avatarShirts],['pants','바지',avatarPants]] as const).map(([key,label,colors])=><fieldset key={key} disabled={busy}><legend>{label}</legend>{colors.map((color,index)=><button key={color} type="button" aria-label={label+' 색상 '+(index+1)} aria-pressed={(avatar[key]??0)===index} style={{background:color}} onClick={()=>setAvatar({...avatar,[key]:index})}/>)}</fieldset>)}
    {([['hairStyle','머리 모양',avatarHairStyles],['topStyle','상의 모양',avatarTopStyles],['accessory','액세서리',avatarAccessories]] as const).map(([key,label,options])=><label key={key}>{label}
     <select value={avatar[key]??0} disabled={busy} onChange={e=>setAvatar({...avatar,[key]:Number(e.target.value)})}>
      {options.map((option,index)=><option key={option} value={index}>{option}</option>)}
     </select>
    </label>)}
    <button className="sanctuary-primary" disabled={busy||!avatar.name.trim()}>캐릭터 저장</button>
   </form>{message&&<p role="status" className="sanctuary-community-feedback">{message}</p>}
  </SanctuaryDialog>
  <SanctuaryDialog open={boardOpen} title="중보기도 게시판" onClose={onBoardClose} className="sanctuary-prayer-board">
   <div className="sanctuary-board-intro"><span className="sanctuary-paper-seal" aria-hidden="true">✦</span><div><strong>서로의 마음을 맡겨두는 곳</strong><p>기도제목은 로그인한 이웃에게 공유됩니다.</p></div></div>
   <nav className="sanctuary-board-nav" aria-label="중보기도 게시판 메뉴"><button type="button" aria-pressed={view!=='write'} onClick={()=>{setView('list');setMessage('')}}>기도 모아보기</button><button type="button" aria-pressed={view==='write'} onClick={()=>{setView('write');setMessage('')}}>{draft.title||draft.body?'작성 이어쓰기':'기도제목 쓰기'}</button></nav>
   {view==='list'&&<>
    <div className="sanctuary-board-filters" role="group" aria-label="기도제목 분류">{([['active','중보 중'],['answered','감사·응답'],['mine','내 기도']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label} <span>{counts[key]}</span></button>)}</div>
    {!room.loaded?<p className="sanctuary-board-empty">기도제목을 불러오고 있어요.</p>:!visible.length?<p className="sanctuary-board-empty">{filter==='active'?'첫 기도 쪽지를 붙여주세요.':filter==='mine'?'아직 나눈 기도제목이 없어요.':'아직 응답 쪽지가 없어요.'}</p>:<div className="sanctuary-prayer-notes">{visible.map((p,index)=><article key={p.id} className={'sanctuary-prayer-note note-'+index%4}><button type="button" onClick={()=>read(p)} aria-label={'기도제목 열기: '+p.title}><span className="sanctuary-note-pin" aria-hidden="true"/><small>{p.answered?'감사 · 응답':p.name+'의 기도'}</small><h4>{p.title}</h4><p>{p.body}</p><footer><span>♡ {Object.keys(room.intercessions[p.id]||{}).length}명이 함께</span><span>읽기 ↗</span></footer></button></article>)}</div>}
    <p className="sanctuary-community-hint">최근 100개 · 접속·방문 인원은 계정당 한 명, 오늘은 한국 시간 기준입니다.</p>
   </>}
   {view==='read'&&(selected?(()=>{
    const prayed=!!room.intercessions[selected.id]?.[uid],count=Object.keys(room.intercessions[selected.id]||{}).length
    return <article className={'sanctuary-shared-prayer sanctuary-prayer-detail '+(selected.answered?'is-answered':'')}>
     <button type="button" className="sanctuary-board-back" onClick={()=>setView('list')}>← 게시판으로</button>
     <div><span>{selected.answered?'감사 · 응답':'함께 중보해 주세요'}</span><small>{selected.name} · {new Date(selected.createdAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'})}</small></div>
     <h4>{selected.title}</h4><p>{selected.body}</p>
     <footer><button type="button" disabled={busy||prayed||selected.answered||!room.connected} aria-pressed={prayed} onClick={()=>void action(()=>room.pray(selected.id),'함께 기도한 마음을 전했습니다.')}>{prayed?'♥ 함께 기도했어요':'♡ 함께 기도했어요'} · {count}</button>
      {selected.uid===uid&&<div><button type="button" disabled={busy} onClick={()=>{writeDraft({id:selected.id,title:selected.title,body:selected.body});setView('write');setMessage('')}}>수정</button><button type="button" disabled={busy||!room.connected} onClick={()=>void action(()=>room.answerPrayer(selected))}>{selected.answered?'중보 재개':'응답 표시'}</button><button type="button" disabled={busy||!room.connected} onClick={()=>{if(window.confirm('이 기도제목을 삭제할까요?'))void action(async()=>{await room.deletePrayer(selected.id);setView('list')},'기도제목을 삭제했습니다.')}}>삭제</button></div>}
     </footer>
    </article>
   })():<p className="sanctuary-board-empty">이 기도 쪽지를 찾을 수 없습니다.<button type="button" onClick={()=>setView('list')}>게시판으로</button></p>)}
   {view==='write'&&<form className="sanctuary-shared-prayer-form sanctuary-paper-composer" onSubmit={event=>{event.preventDefault();void action(async()=>{await room.savePrayer(draft.title,draft.body,draft.id);writeDraft({title:'',body:''});setView('list');setFilter('active')},'기도 쪽지를 게시판에 붙였습니다.')}}>
    <label>기도제목<input aria-label="공동 기도제목" placeholder="함께 기도해 주세요" maxLength={80} required disabled={busy} value={draft.title} onChange={e=>writeDraft({...draft,title:e.target.value})}/></label>
    <label>기도 내용<textarea aria-label="공동 기도 내용" placeholder="중보를 부탁하는 내용을 남겨주세요" maxLength={1500} required disabled={busy} value={draft.body} onChange={e=>writeDraft({...draft,body:e.target.value})}/></label>
    <small className="sanctuary-community-hint">작성 중인 쪽지는 이 계정의 기기에 자동 저장됩니다. 창을 닫아도 이어 쓸 수 있어요.</small>
    <div>{(draft.title||draft.body)&&<button type="button" disabled={busy} onClick={()=>{if(window.confirm('작성 중인 초안을 버릴까요?'))writeDraft({title:'',body:''})}}>초안 버리기</button>}{draft.id&&<button type="button" disabled={busy} onClick={()=>{setView('list')}}>수정 취소</button>}<button className="sanctuary-primary" disabled={busy||!room.connected}>{busy?'저장 중…':draft.id?'기도제목 수정':'기도제목 나누기'}</button></div>
   </form>}
   {message&&<p className="sanctuary-community-feedback" role="status">{message}</p>}
   {room.error&&<p className="sanctuary-community-error">{room.error}</p>}
  </SanctuaryDialog>
 </div>
}
