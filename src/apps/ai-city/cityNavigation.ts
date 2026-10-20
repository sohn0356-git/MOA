import {useEffect,useRef,useState} from 'react'
type Entry<T>={state:T;scrollY:number;focus:string;index:number}
function focusPath(){
 let node=document.activeElement as HTMLElement|null
 const pieces:string[]=[]
 while(node&&node!==document.body){
  if(node.id){pieces.unshift('[id='+JSON.stringify(node.id)+']');break}
  const parent=node.parentElement
  const index=parent?Array.from(parent.children).filter(child=>child.tagName===node!.tagName).indexOf(node)+1:1
  pieces.unshift(node.tagName.toLowerCase()+':nth-of-type('+index+')');node=parent
 }
 return pieces.join(' > ')
}
export function useCityNavigation<T extends {view:string}>(state:T,restore:(state:T)=>void){
 const current=useRef(state);current.current=state
 const apply=useRef(restore);apply.current=restore
 const positions=useRef<Record<string,T>>({})
 const pending=useRef<{heading:boolean}|null>(null)
 const returning=useRef<Entry<T>|null>(null)
 const restoring=useRef(false)
 const index=useRef(0),[canBack,setCanBack]=useState(false)
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 function capture():Entry<T>{return{state:current.current,scrollY:window.scrollY,focus:focusPath(),index:index.current}}
 function navigate(action:()=>void,heading=false){
  if(timer.current)clearTimeout(timer.current)
  const entry=capture();positions.current[entry.state.view]=entry.state
  window.history.replaceState({...window.history.state,moaCity:entry},'',window.location.href)
  pending.current={heading};action()
 }
 function restoreEntry(entry:Entry<T>){restoring.current=true;returning.current=entry;index.current=entry.index;setCanBack(entry.index>0);apply.current(entry.state)}
 useEffect(()=>{
  const existing=window.history.state?.moaCity as Entry<T>|undefined
  if(existing)restoreEntry(existing)
  else window.history.replaceState({...window.history.state,moaCity:capture()},'',window.location.href)
  const pop=(event:PopStateEvent)=>{if(event.state?.moaCity)restoreEntry(event.state.moaCity)}
  window.addEventListener('popstate',pop)
  return()=>{window.removeEventListener('popstate',pop);if(timer.current)clearTimeout(timer.current)}
 },[])
 useEffect(()=>{
  if(returning.current){
   const entry=returning.current;returning.current=null
   let attempts=0
   function focus(){
    const element=entry.focus?document.querySelector<HTMLElement>(entry.focus):null
    if(entry.focus&&!element&&attempts++<20){timer.current=setTimeout(focus,100);return}
    ;(element??document.getElementById('city-view-title'))?.focus({preventScroll:true})
    window.scrollTo({top:entry.scrollY,behavior:'instant'})
    restoring.current=false
   }
   timer.current=setTimeout(focus,0)
  }else if(pending.current){
   const heading=pending.current.heading;pending.current=null;index.current+=1;setCanBack(true)
   window.history.pushState({...window.history.state,moaCity:capture()},'',window.location.href)
   if(heading)document.getElementById('city-view-title')?.focus({preventScroll:true})
   timer.current=setTimeout(()=>{restoring.current=false},0)
  }
 })
 return{navigate,position:(view:string)=>positions.current[view],restoring,canBack,back:()=>window.history.back()}
}
