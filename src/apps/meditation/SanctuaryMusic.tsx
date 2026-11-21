import {useEffect,useRef,useState} from 'react'
import {Play,Square} from 'lucide-react'
import {SANCTUARY_CCM_URL} from './sanctuaryAudio'
export function SanctuaryMusic({source=SANCTUARY_CCM_URL}:{source?:string}){
 const audio=useRef<HTMLAudioElement>(null),mounted=useRef(false),request=useRef(0),volume=useRef(20)
 const [playing,setPlaying]=useState(false),[status,setStatus]=useState('찬양을 준비하고 있어요.'),[failed,setFailed]=useState(false)
 async function play(node:HTMLAudioElement){
  const id=++request.current
  setStatus('찬양을 준비하고 있어요.')
  try{await node.play()}catch(error){
   if(!mounted.current||id!==request.current)return
   setPlaying(false)
   if(error instanceof DOMException&&error.name==='NotAllowedError')setStatus('소리를 켜려면 노래 재생을 눌러주세요.')
   else if(error instanceof DOMException&&error.name==='AbortError')return
   else{setFailed(true);setStatus('음원을 재생하지 못했어요. 연결 상태를 확인하고 재생 버튼으로 다시 시도해주세요.')}
  }
 }
 useEffect(()=>{
  const node=audio.current;if(!node)return
  mounted.current=true;node.src=source;node.volume=volume.current/100;setFailed(false);setPlaying(false)
  void play(node)
  return()=>{mounted.current=false;request.current++;node.pause();node.removeAttribute('src');node.load()}
 },[source])
 return <span className="sanctuary-room-music">
  <audio ref={audio} src={source} loop preload="none" onPlaying={()=>{if(!mounted.current)return;setPlaying(true);setFailed(false);setStatus('잔잔한 찬양이 반복해서 흐릅니다.')}} onPause={()=>{if(!mounted.current||!audio.current?.paused)return;request.current++;setPlaying(false);if(!failed)setStatus('노래를 정지했습니다.')}} onError={()=>{if(!mounted.current)return;request.current++;setPlaying(false);setFailed(true);setStatus('음원을 불러오지 못했어요. 연결 상태를 확인하고 재생 버튼으로 다시 시도해주세요.')}}/>
  <button type="button" title={status} aria-label={playing?'노래 정지':'노래 재생'} onClick={()=>{const node=audio.current;if(!node)return;if(playing){request.current++;node.pause();node.currentTime=0}else{if(failed){node.load();setFailed(false)}void play(node)}}}>{playing?<Square size={13}/>:<Play size={13}/>}<span>{playing?'노래 정지':'노래 재생'}</span></button>
  <span className="sanctuary-music-status" role="status">{status}</span>
 </span>
}
