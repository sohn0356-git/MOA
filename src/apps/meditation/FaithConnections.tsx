import {FriendGarden} from './FriendGarden'
import {useState,type ReactNode} from 'react'
import {Bell,Users,UserPlus,FolderPlus,Check,ChevronRight} from 'lucide-react'
import {SanctuaryDialog} from './SanctuaryDialog'
import {SyncedAuthorAvatar} from './FeedAuthor'
import type {FaithConnections,FriendGroup,FriendRequest,NotificationPreferences} from './useFaithConnections'
import './FaithConnections.css'
export function FriendRequestButton({social,target,name,onSignIn}:{social:FaithConnections;target:string;name:string;onSignIn?:()=>Promise<unknown>}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 if(target===social.uid)return null
 const relation=social.relationship(target)
 async function act(){if(!social.uid){await onSignIn?.();return}setBusy(true);setMessage('');try{if(relation?.status==='pending'&&relation.from===social.uid)await social.cancel(relation);else if(relation?.status==='pending')await social.respond(relation,true);else{await social.send(target,name);setMessage('친구 요청을 보냈습니다.')}}catch{setMessage('친구 요청을 처리하지 못했습니다. 다시 시도해주세요.')}finally{setBusy(false)}}
 return <div className="faith-friend-request"><button type="button" disabled={busy||!!social.uid&&!social.loaded||relation?.status==='accepted'} onClick={()=>void act()}>{relation?.status==='accepted'?<Check size={15}/>:<UserPlus size={15}/>} {!social.uid?'로그인하고 친구 요청':relation?.status==='accepted'?'친구':relation?.status==='pending'?relation.from===social.uid?'요청 취소':'친구 요청 수락':'친구 요청'}</button>{message&&<p role="status">{message}</p>}{social.error&&<p role="alert">{social.error} <button type="button" onClick={social.retry}>다시 불러오기</button></p>}</div>
}
export function ConnectionHub({social,notifications,enabled,kind='manage',onSignIn}:{social:FaithConnections;notifications:FriendRequest[];enabled:boolean;kind?:'manage'|'bell'|'inline';onSignIn?:()=>Promise<unknown>}){
 const [view,setView]=useState<''|'friends'|'notifications'>(kind==='inline'?'friends':''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[groupName,setGroupName]=useState('')
 async function action(task:()=>Promise<unknown>){if(busy)return;setBusy(true);setError('');try{await task()}catch(e){setError(e instanceof Error&&/[가-힣]/.test(e.message)?e.message:'처리하지 못했습니다. 연결을 확인하고 다시 시도해주세요.')}finally{setBusy(false)}}
 const pending=social.requests.filter(r=>r.to===social.uid&&r.status==='pending')
 return <>
  {kind==='bell'?social.uid&&<button type="button" className="faith-connections-bell" aria-label={'알림'+(enabled&&notifications.length?' '+notifications.length+'개':'')} onClick={()=>setView('notifications')}><Bell size={19}/>{enabled&&notifications.length>0&&<span>{notifications.length}</span>}</button>:kind==='inline'?null:<button type="button" className="faith-connections-card" onClick={()=>{if(!social.uid){void onSignIn?.();return}setView('friends')}}><Users size={23}/><span><strong>친구 관리</strong><small>{social.uid?`친구 ${social.friends.length}명 · 그룹 ${social.groups.length}개`:'로그인하고 친구와 함께해요'}</small></span>{enabled&&pending.length>0&&<b>{pending.length}</b>}<ChevronRight size={17}/></button>}
  {kind==='inline'&&social.uid&&<FriendGarden friends={social.friends}/>}
  {view&&<ConnectionSurface inline={kind==='inline'} title={view==='friends'?'친구 관리':'알림'} onClose={()=>{if(!busy)setView('')}}>
   {error&&<p className="faith-connection-error" role="alert">{error}</p>}{social.error&&<p role="alert">{social.error} <button type="button" onClick={social.retry}>다시 불러오기</button></p>}
   {!social.uid?<button type="button" className="faith-connection-link" onClick={()=>void onSignIn?.()}>로그인하고 친구 관리</button>:!social.loaded?<p role="status">친구 정보를 불러오고 있어요.</p>:view==='notifications'?<div className="faith-notification-list">{!enabled?<p>설정에서 친구 알림을 켤 수 있어요.</p>:social.notices.length?social.notices.map(r=><button key={r.id} type="button" aria-label={(r.from===social.uid?r.toName:r.fromName)+' '+(r.status==='accepted'?'친구 요청을 수락했어요.':'친구 요청을 보냈어요.')} disabled={busy} onClick={()=>void action(async()=>{await social.markRead(r);setView('friends')})}><span className="faith-connection-avatar"><SyncedAuthorAvatar uid={r.from===social.uid?r.to:r.from} name={r.from===social.uid?r.toName:r.fromName}/></span><span><strong>{r.from===social.uid?r.toName:r.fromName}</strong><small>{r.status==='accepted'?'친구 요청을 수락했어요.':'친구 요청을 보냈어요.'}</small></span></button>):<p>아직 받은 알림이 없어요.</p>}<button className="faith-connection-link" type="button" onClick={()=>setView('friends')}>친구 관리 열기</button></div>:<div className="faith-friends-body">
    {pending.length>0&&<section><h4>받은 친구 요청 <small>{pending.length}</small></h4>{pending.map(r=><article className="faith-connection-row" key={r.id}><span className="faith-connection-avatar"><SyncedAuthorAvatar uid={r.from} name={r.fromName}/></span><strong>{r.fromName}</strong><button disabled={busy} type="button" onClick={()=>void action(async()=>{await social.respond(r,true);await social.markRead(r)})}>수락</button><button disabled={busy} type="button" onClick={()=>void action(async()=>{await social.respond(r,false);await social.markRead(r)})}>거절</button></article>)}</section>}
    <section><h4>친구 <small>{social.friends.length}</small></h4>{social.friends.length?social.friends.map(friend=><article className="faith-connection-row" key={friend.uid}><span className="faith-connection-avatar"><SyncedAuthorAvatar uid={friend.uid} name={friend.name}/></span><strong>{friend.name}</strong><button disabled={busy} type="button" onClick={()=>{if(confirm(friend.name+' 님을 친구에서 삭제할까요?'))void action(()=>social.unfriend(friend.uid))}}>친구 삭제</button></article>):<p>묵상을 나눈 이웃의 프로필에서 친구를 요청해보세요.</p>}</section>
    <section><h4>친구 그룹</h4><form className="faith-group-create" onSubmit={e=>{e.preventDefault();void action(async()=>{await social.createGroup(groupName);setGroupName('')})}}><label><span className="faith-sr-only">새 친구 그룹 이름</span><input aria-label="새 친구 그룹 이름" value={groupName} maxLength={30} disabled={busy} placeholder="새 그룹 이름" onChange={e=>setGroupName(e.target.value)}/></label><button type="submit" disabled={busy||!groupName.trim()}><FolderPlus size={17}/>만들기</button></form>
     {social.groups.map(group=><GroupEditor key={group.id} group={group} social={social} busy={busy} action={action}/>)}
    </section>
    {social.requests.some(r=>r.from===social.uid&&r.status==='pending')&&<section><h4>보낸 요청</h4>{social.requests.filter(r=>r.from===social.uid&&r.status==='pending').map(r=><div className="faith-connection-row" key={r.id}><strong>{r.toName}</strong><button type="button" disabled={busy} onClick={()=>void action(()=>social.cancel(r))}>요청 취소</button></div>)}</section>}
   </div>}
  </ConnectionSurface>}
 </>
}
function GroupEditor({group,social,busy,action}:{group:FriendGroup;social:FaithConnections;busy:boolean;action:(fn:()=>Promise<unknown>)=>Promise<void>}){
 const [name,setName]=useState(group.name)
 return <details className="faith-friend-group"><summary>{group.name}<span>{social.friends.filter(f=>group.members?.[f.uid]).length}명</span></summary><div><div className="faith-group-create"><input aria-label={group.name+' 그룹 이름'} value={name} maxLength={30} disabled={busy} onChange={e=>setName(e.target.value)}/><button type="button" disabled={busy||!name.trim()||name===group.name} onClick={()=>void action(()=>social.renameGroup(group,name))}>이름 변경</button><button type="button" disabled={busy} onClick={()=>{if(confirm('그룹을 삭제할까요? 친구는 삭제되지 않습니다.'))void action(()=>social.deleteGroup(group.id))}}>그룹 삭제</button></div>{social.friends.length?social.friends.map(f=><label className="faith-group-member" key={f.uid}><input type="checkbox" checked={!!group.members?.[f.uid]} disabled={busy} onChange={()=>void action(()=>social.toggleMember(group,f.uid))}/>{f.name}</label>):<p>친구를 추가하면 이 그룹에 담을 수 있어요.</p>}</div></details>
}
export function NotificationSwitches({values,loaded,error,toggle,loggedIn}:{values:NotificationPreferences;loaded:boolean;error:string;toggle:(key:keyof NotificationPreferences)=>Promise<void>;loggedIn:boolean}){
 const [busy,setBusy]=useState(false)
 return <section className="faith-notification-settings" aria-label="알림 설정"><h3>알림 설정</h3>{(['friends','chapel','activity'] as const).map(key=><div key={key}><span><strong>{key==='friends'?'친구 알림':key==='chapel'?'예배당 알림':'묵상 활동 알림'}</strong><small>{key==='friends'?'친구 요청과 수락 소식':key==='chapel'?'새 기도제목과 중보기도 소식':'내 글의 댓글과 좋아요'}</small></span><button type="button" role="switch" aria-label={key==='friends'?'친구 알림':key==='chapel'?'예배당 알림':'묵상 활동 알림'} aria-checked={values[key]!==false} disabled={!loggedIn||!loaded||busy} onClick={async()=>{setBusy(true);try{await toggle(key)}catch{}finally{setBusy(false)}}}><span/></button></div>)}{!loggedIn&&<p>로그인하면 알림 설정을 저장할 수 있어요.</p>}{error&&<p role="alert">{error}</p>}</section>
}

function ConnectionSurface({inline,title,onClose,children}:{inline:boolean;title:string;onClose:()=>void;children:ReactNode}){
 return inline?<section className="faith-connections-inline" aria-label={title}>{children}</section>:<SanctuaryDialog open title={title} className="faith-connections-dialog" onClose={onClose}>{children}</SanctuaryDialog>
}
