import {useId} from 'react'
import {Send} from 'lucide-react'
import './CommentComposer.css'
export function CommentComposer({label,value,onChange,onSave,actionLabel,placeholder,disabled=false,maxLength,submit=false,fieldLabel}:{label:string;value:string;onChange:(value:string)=>void;onSave?:()=>void;actionLabel:string;placeholder?:string;disabled?:boolean;maxLength?:number;submit?:boolean;fieldLabel?:string}){
 const id=useId()
 return <div className="moa-comment-editor"><label className="moa-comment-editor__label" htmlFor={id}>{label}</label><textarea id={id} className="moa-comment-editor__input" aria-label={fieldLabel||label} value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder} rows={4} maxLength={maxLength} disabled={disabled}/><div className="moa-comment-editor__footer"><span>{value.length.toLocaleString()}{maxLength?' / '+maxLength.toLocaleString():''}자</span><button className="moa-comment-editor__submit" type={submit?'submit':'button'} aria-label={actionLabel} disabled={disabled||!value.trim()} onClick={submit?undefined:onSave}><Send size={15}/>{actionLabel}</button></div></div>
}
