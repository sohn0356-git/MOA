import {useState} from 'react'
import {AvatarEditor} from './AvatarEditor'
import {PixelAvatar} from './PixelAvatar'
import {useSanctuaryAvatar} from './useSanctuaryAvatar'
import type {SanctuaryMember} from './sanctuaryState'
export function ProfileAvatarCard({member,authBusy,onSignIn}:{member:SanctuaryMember|null;authBusy?:boolean;onSignIn?:()=>Promise<unknown>}){
 const [signing,setSigning]=useState(false),[error,setError]=useState('')
 if(member)return <SavedAvatar key={member.uid} member={member}/>
 return <section className="faith-profile faith-profile-avatar" aria-label="내 아바타">
  <div><h3>내 아바타</h3><p>로그인하면 예배당에서 선택한 캐릭터를 여기서도 사용할 수 있어요.</p>
  <button className="faith-outline-button" type="button" disabled={authBusy||signing||!onSignIn} onClick={async()=>{if(!onSignIn)return;setSigning(true);setError('');try{await onSignIn()}catch{setError('로그인을 완료하지 못했습니다. 다시 시도해주세요.')}finally{setSigning(false)}}}>{authBusy||signing?'계정 확인 중…':'로그인하고 아바타 보기'}</button>{error&&<p role="alert">{error}</p>}</div>
 </section>
}
function SavedAvatar({member}:{member:SanctuaryMember}){
 const avatar=useSanctuaryAvatar(member),[editing,setEditing]=useState(false)
 return <section className="faith-profile faith-profile-avatar" aria-label="내 아바타">
  <div className="faith-profile-pixel"><PixelAvatar profile={avatar.profile} facing={-25} scale={1.45} moving={false} seated={false} label="프로필의 내 아바타"/></div>
  <div><h3>{avatar.loaded?avatar.profile.name:'내 아바타'}</h3><p>예배당과 함께 사용하는 나의 캐릭터</p>
   <button type="button" className="faith-outline-button" disabled={!avatar.loaded} onClick={()=>setEditing(true)}>아바타 편집</button>
   {avatar.error&&<p role="alert">{avatar.error}</p>}
  </div>
  {editing&&<AvatarEditor profile={avatar.profile} onSave={avatar.saveProfile} onClose={()=>setEditing(false)}/>}
 </section>
}
