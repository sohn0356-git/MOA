import {useEffect,useState} from 'react'
import {onValue,ref,query,orderByChild,equalTo,limitToLast} from 'firebase/database'
import {getRealtimeDb} from '../../services/firebase'
import {getFaithDb} from '../../services/faithSession'
import {PixelAvatar} from './PixelAvatar'
import {normalizeAvatar,type AvatarProfile,type SharedPrayer} from './sanctuaryCommunity'
import {SanctuaryDialog} from './SanctuaryDialog'
import './FeedAuthor.css'
export type AuthorPhoto={id:string;publicId?:string;ownerUid?:string;authorUid?:string;authorName?:string;authorAvatarUrl?:string;authorPixelAvatar?:AvatarProfile;imageUrl:string;caption:string;selectedDate:string;sourceType?:string}
export const authorUid=(photo:AuthorPhoto)=>photo.ownerUid||photo.authorUid||''
export function useFeedAuthorAvatars(photos:AuthorPhoto[],viewerUid:string){
 const ids=JSON.stringify([...new Set(photos.map(authorUid).filter(Boolean))].sort()),[avatars,setAvatars]=useState<Record<string,AvatarProfile>>({})
 useEffect(()=>{let alive=true;setAvatars({});
  const stops=JSON.parse(ids).map((uid:string)=>onValue(ref(getRealtimeDb(),'sanctuary/avatars/'+uid),s=>{if(alive)setAvatars(current=>({...current,[uid]:normalizeAvatar(s.val(),photos.find(photo=>authorUid(photo)===uid)?.authorName)}))},()=>{}))
  return()=>{alive=false;stops.forEach((stop:()=>void)=>stop())}
 },[ids,viewerUid])
 return avatars
}
export function FeedAuthorAvatar({photo,profile}:{photo:AuthorPhoto;profile?:AvatarProfile}){
 const avatar=profile||normalizeAvatar(photo.authorPixelAvatar,photo.authorName)
 return <span className="faith-author-avatar" aria-hidden="true"><PixelAvatar profile={avatar} facing={-25} moving={false} seated={false} scale={.62}/></span>
}
export function SyncedAuthorAvatar({uid,name}:{uid:string;name:string}) {
 const photo={id:uid,ownerUid:uid,authorName:name,imageUrl:'',caption:'',selectedDate:''}
 const profiles=useFeedAuthorAvatars([photo],'')
 return <FeedAuthorAvatar photo={photo} profile={profiles[uid]}/>
}
export function FeedAuthorDialog({photo,photos,profile,viewerUid,onClose,onSignIn}:{photo:AuthorPhoto;photos:AuthorPhoto[];profile?:AvatarProfile;viewerUid:string;onClose:()=>void;onSignIn?:()=>Promise<unknown>}){
 const [tab,setTab]=useState<'devotions'|'prayers'>('devotions'),[prayers,setPrayers]=useState<SharedPrayer[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('')
 const uid=authorUid(photo),name=photo.authorName||profile?.name||'이웃'
 useEffect(()=>{let alive=true;setLoaded(false);setPrayers([]);setError('');if(!uid||!viewerUid)return
  const stop=onValue(query(ref(getFaithDb(),'sanctuary/prayers'),orderByChild('uid'),equalTo(uid),limitToLast(100)),s=>{if(alive){setPrayers(Object.entries(s.val()||{}).map(([id,p])=>({...p as Omit<SharedPrayer,'id'>,id})).filter(p=>p.uid===uid).sort((a,b)=>b.createdAt-a.createdAt));setLoaded(true)}},()=>{if(alive){setError('공유 기도제목을 불러오지 못했습니다.');setLoaded(true)}})
  return()=>{alive=false;stop()}
 },[uid,viewerUid])
 const posts=photos.filter(p=>!!uid&&authorUid(p)===uid)
 return <SanctuaryDialog open title="작성자의 나눔" onClose={onClose} className="faith-author-dialog">
  <header className="faith-author-heading"><FeedAuthorAvatar photo={photo} profile={profile}/><div><h3>{name}</h3><p>공개된 묵상과 함께 나눈 기도제목</p></div></header>
  <nav className="faith-author-tabs" aria-label="작성자 기록"><button type="button" aria-pressed={tab==='devotions'} onClick={()=>setTab('devotions')}>묵상 {posts.length}</button><button type="button" aria-pressed={tab==='prayers'} onClick={()=>setTab('prayers')}>기도제목</button></nav>
  {tab==='devotions'?<div className="faith-author-posts">{posts.length?posts.map(p=><details key={p.publicId||p.id}><summary>{p.imageUrl&&<img src={p.imageUrl} alt="" loading="lazy"/>}<span><small>{p.selectedDate}</small><strong>{p.caption.split('\n').find(Boolean)||'묵상 나눔'}</strong></span></summary><p>{p.caption}</p></details>):<p>아직 공개된 묵상이 없어요.</p>}</div>:!viewerUid?<div className="faith-author-empty"><p>함께 나눈 기도제목은 로그인 후 확인할 수 있어요.</p>{onSignIn&&<button type="button" onClick={()=>{onClose();void onSignIn().catch(()=>{})}}>로그인하고 확인하기</button>}</div>:!loaded?<p role="status">기도제목을 불러오고 있어요.</p>:error?<p role="alert">{error}</p>:prayers.length?<div className="faith-author-prayers">{prayers.map(p=><article key={p.id}><small>{p.answered?'감사 · 응답':'함께 중보해 주세요'}</small><h4>{p.title}</h4><p>{p.body}</p></article>)}</div>:<p>아직 함께 나눈 기도제목이 없어요.</p>}
 </SanctuaryDialog>
}
