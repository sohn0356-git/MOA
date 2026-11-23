import {Shuffle} from 'lucide-react'
import {useEffect,useRef,useState} from 'react'
import {AvatarPreview} from './AvatarPreview'
import {PixelAvatar} from './PixelAvatar'
import {SanctuaryDialog} from './SanctuaryDialog'
import {randomizeAvatar,avatarSkins,avatarHairs,avatarShirts,avatarPants,getAvatarHairStyles,avatarPresets,applyAvatarPreset,matchesAvatarPreset,selectAvatarGender,avatarTopStyles,avatarAccessories,type AvatarProfile} from './sanctuaryCommunity'
import './PixelAvatar.css'
import './SanctuaryCommunity.css'
import './SanctuaryCompact.css'
export function AvatarEditor({profile,onSave,onClose}:{profile:AvatarProfile;onSave:(profile:AvatarProfile)=>Promise<void>;onClose:()=>void}){
 const [avatar,setAvatar]=useState(profile),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const lock=useRef(false),mounted=useRef(true)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 async function save(){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('')
  try{await onSave(avatar);if(mounted.current)onClose()}catch{if(mounted.current)setMessage('캐릭터를 저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.')}finally{lock.current=false;if(mounted.current)setBusy(false)}
 }
 return <div className="sanctuary-community sanctuary-avatar-host">
  <SanctuaryDialog open title="나의 캐릭터" onClose={onClose} className="sanctuary-character-dialog">
   <form className="sanctuary-avatar-editor sanctuary-avatar-studio" onSubmit={event=>{event.preventDefault();void save()}}>
    <div className="sanctuary-avatar-showcase">
     <div className="sanctuary-avatar-random-tools"><button type="button" className="sanctuary-avatar-random" aria-label="아바타 랜덤 생성" title="선택한 성별에서 외형을 무작위로 바꿉니다" disabled={busy} onClick={()=>setAvatar(current=>randomizeAvatar(current))}><Shuffle size={15} aria-hidden="true"/>랜덤</button></div>
     <AvatarPreview profile={avatar}/>
     <section className="sanctuary-avatar-presets" aria-label="샘플 캐릭터">
      <div className="sanctuary-gender-tabs" role="tablist" aria-label="캐릭터 성별">{(['male','female'] as const).map(gender=><button key={gender} type="button" role="tab" aria-selected={(avatar.gender??'male')===gender} aria-controls="sanctuary-samples" id={'avatar-tab-'+gender} disabled={busy} onClick={()=>setAvatar(current=>selectAvatarGender(current,gender))}>{gender==='male'?'남성':'여성'}</button>)}</div>
      <h4>마음에 드는 모습으로 시작해요</h4>
      <div role="tabpanel" id="sanctuary-samples" aria-labelledby={'avatar-tab-'+(avatar.gender??'male')}><div className="sanctuary-avatar-preset-grid" role="group" aria-label="샘플 캐릭터 선택">{avatarPresets.filter(p=>p.appearance.gender===(avatar.gender??'male')).map(preset=><button type="button" key={preset.id} aria-label={preset.label+' 샘플 선택'} aria-pressed={matchesAvatarPreset(avatar,preset)} disabled={busy} onClick={()=>setAvatar(current=>applyAvatarPreset(current,preset.id))}>
       <span className="sanctuary-preset-figure"><PixelAvatar profile={{name:avatar.name,...preset.appearance}} facing={-25} moving={false} seated={false} scale={.75} label={preset.label+' 샘플 캐릭터'}/></span>
       <span>{preset.label}</span><small>{preset.appearance.gender==='female'?'여성':'남성'}</small>
      </button>)}</div></div>
      <p>샘플을 고른 뒤 색과 머리를 바꿔도 좋아요.</p>
     </section>
    </div>
    <div className="sanctuary-avatar-fields">
    <label>캐릭터 이름<input aria-label="캐릭터 이름" value={avatar.name} maxLength={24} required disabled={busy} onChange={e=>setAvatar({...avatar,name:e.target.value})}/></label>
    {([['skin','피부',avatarSkins],['hair','머리',avatarHairs],['shirt','옷',avatarShirts],['pants','바지',avatarPants]] as const).map(([key,label,colors])=><fieldset key={key} disabled={busy}><legend>{label}</legend>{colors.map((color,index)=><button key={color} type="button" aria-label={label+' 색상 '+(index+1)} aria-pressed={(avatar[key]??0)===index} style={{background:color}} onClick={()=>setAvatar({...avatar,[key]:index})}/>)}</fieldset>)}
    {([['hairStyle','머리 모양',getAvatarHairStyles(avatar.gender)],['topStyle','상의 모양',avatarTopStyles],['accessory','액세서리',avatarAccessories]] as const).map(([key,label,options])=><label key={key}>{label}
     <select value={avatar[key]??0} disabled={busy} onChange={e=>setAvatar({...avatar,[key]:Number(e.target.value)})}>
      {options.map((option,index)=><option key={option} value={index}>{option}</option>)}
     </select>
    </label>)}
    <button className="sanctuary-primary" disabled={busy||!avatar.name.trim()}>캐릭터 저장</button>
    </div>
   </form>{message&&<p role="alert" className="sanctuary-community-feedback">{message}</p>}
  </SanctuaryDialog>
 </div>
}
