import {useState,type FormEvent} from 'react'
import {Eye,EyeOff,Mail,LockKeyhole} from 'lucide-react'
import {SanctuaryDialog} from '../apps/meditation/SanctuaryDialog'
import './EmailAuthDialog.css'

export function EmailAuthDialog({onClose,onSubmit,error,onGoogle}:{onClose:()=>void;onSubmit:(email:string,password:string,create:boolean)=>Promise<void>;error:string|null;onGoogle?:()=>void}){
 const [create,setCreate]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[visible,setVisible]=useState(false),[pending,setPending]=useState(false),[localError,setLocalError]=useState(''),[failed,setFailed]=useState(false)
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(pending)return
  if(create&&password!==confirm){setLocalError('비밀번호가 서로 다릅니다. 다시 확인해주세요.');return}
  setPending(true);setLocalError('');setFailed(false)
  try{await onSubmit(email,password,create);onClose()}
  catch{setFailed(true)}
  finally{setPending(false)}
 }
 return <SanctuaryDialog open title="이메일 로그인" className="faith-email-dialog" onClose={()=>{if(!pending)onClose()}}>
  {onGoogle&&<button className="faith-email-google" type="button" disabled={pending} onClick={()=>{onClose();onGoogle()}}><span aria-hidden="true" className="faith-entry-google-mark">G</span>구글 계정으로 로그인</button>}
  <p className="faith-email-intro">나의 묵상과 예배당 캐릭터를 이어가세요.</p>
  <div className="faith-email-tabs" aria-label="이메일 계정"><button type="button" disabled={pending} aria-pressed={!create} onClick={()=>{setCreate(false);setPassword('');setConfirm('');setLocalError('');setFailed(false)}}>로그인</button><button type="button" disabled={pending} aria-pressed={create} onClick={()=>{setCreate(true);setPassword('');setConfirm('');setLocalError('');setFailed(false)}}>회원가입</button></div>
  <form className="faith-email-form" onSubmit={event=>void submit(event)} aria-busy={pending}>
   <label><span><Mail size={14} aria-hidden="true"/>이메일</span><input autoFocus required type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} disabled={pending} onChange={event=>setEmail(event.target.value)} placeholder="name@example.com"/></label>
   <label><span><LockKeyhole size={14} aria-hidden="true"/>비밀번호</span><div className="faith-email-password"><input required type={visible?'text':'password'} autoComplete={create?'new-password':'current-password'} minLength={create?6:undefined} value={password} disabled={pending} onChange={event=>setPassword(event.target.value)} placeholder={create?'6자 이상 입력해주세요':'비밀번호 입력'}/><button type="button" aria-label={visible?'비밀번호 숨기기':'비밀번호 표시'} aria-pressed={visible} disabled={pending} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
   {create&&<label><span>비밀번호 확인</span><input required type={visible?'text':'password'} autoComplete="new-password" value={confirm} disabled={pending} onChange={event=>setConfirm(event.target.value)}/></label>}
   {(localError||failed)&&<p className="faith-email-error" role="alert">{localError||error||'계정 정보를 확인하고 다시 시도해주세요.'}</p>}
   {pending&&<p role="status">{create?'계정을 만들고 있어요…':'로그인하고 있어요…'}</p>}
   <button className="faith-email-submit" type="submit" disabled={pending}>{pending?'잠시만 기다려주세요':create?'이메일로 가입하기':'이메일로 로그인'}</button>
  </form>
 </SanctuaryDialog>
}
