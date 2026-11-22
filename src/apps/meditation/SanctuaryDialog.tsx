import {useEffect,useId,useRef,type ReactNode} from 'react'
export function SanctuaryDialog({open,title,onClose,children,className=''}:{open:boolean;title:string;onClose:()=>void;children:ReactNode;className?:string}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId(),close=useRef(onClose);close.current=onClose
 useEffect(()=>{
  const node=dialog.current;if(!node||!open)return
  const previous=document.activeElement as HTMLElement|null
  if(typeof node.showModal==='function')node.showModal();else node.setAttribute('open','')
  return()=>{if(node.open){if(typeof node.close==='function')node.close();else node.removeAttribute('open')}if(previous?.isConnected)previous.focus({preventScroll:true})}
 },[open])
 return <dialog ref={dialog} className={'sanctuary-dialog '+className} aria-labelledby={id} onCancel={event=>{event.preventDefault();close.current()}} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close.current()}}}>
  <header className="sanctuary-dialog-heading"><div><small>모아 · OUR LITTLE CHAPEL</small><h3 id={id}>{title}</h3></div><button type="button" aria-label={title+' 닫기'} onClick={onClose}>×</button></header>
  {open&&<div className="sanctuary-dialog-body">{children}</div>}
 </dialog>
}
