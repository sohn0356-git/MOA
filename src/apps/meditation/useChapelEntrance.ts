import {useEffect,useLayoutEffect,useRef,useState} from 'react'
export function useChapelEntrance(){
 const entranceRef=useRef<HTMLElement>(null),animation=useRef<Animation|null>(null),alive=useRef(true),locked=useRef(false)
 const [entered,setEntered]=useState(false),[entering,setEntering]=useState(false)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;locked.current=false;animation.current?.cancel()}},[])
 function finish(){animation.current?.cancel();animation.current=null;locked.current=false;if(alive.current)setEntering(false)}
 async function enter(){
  if(locked.current||entered)return
  const node=entranceRef.current
  if(!node?.animate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setEntered(true);return}
  locked.current=true;setEntering(true)
  try{const out=node.animate([{opacity:1},{opacity:0}],{duration:220,easing:'ease-in',fill:'forwards'});animation.current=out;await out.finished;if(alive.current)setEntered(true)}catch{if(alive.current&&locked.current){setEntered(true);finish()}}
 }
 useLayoutEffect(()=>{
  const node=entranceRef.current;if(!entered||!locked.current||!node)return
  try{const previous=animation.current,incoming=node.animate([{opacity:0},{opacity:1}],{duration:340,easing:'ease-out',fill:'forwards'});animation.current=incoming;previous?.cancel();void incoming.finished.then(()=>{if(alive.current)finish()},()=>{if(alive.current)finish()})}catch{finish()}
 },[entered])
 function leave(){finish();setEntered(false)}
 return{entranceRef,entered,entering,enter,leave}
}
