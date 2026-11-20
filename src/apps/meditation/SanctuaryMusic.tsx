import {useEffect,useRef,useState} from 'react'
import {SANCTUARY_CCM_URL} from './sanctuaryAudio'
export function SanctuaryMusic({source=SANCTUARY_CCM_URL}:{source?:string}){
 const audio=useRef<HTMLAudioElement>(null),mounted=useRef(false),request=useRef(0),volume=useRef(20)
 const [playing,setPlaying]=useState(false),[level,setLevel]=useState(20),[status,setStatus]=useState('찬양을 준비하고 있어요.'),[failed,setFailed]=useState(false)
 async function play(node:HTMLAudioElement){
  const id=++request.current
  setStatus('찬양을 준비하고 있어요.')
  try{await node.play()}catch(error){
   if(!mounted.current||id!==request.current)return
   setPlaying(false)
   if(error instanceof DOMException&&error.name==='NotAllowedError')setStatus('소리를 켜려면 찬양 재생을 눌러주세요.')
   else if(error instanceof DOMException&&error.name==='AbortError')return
   else{setFailed(true);setStatus('음원을 재생하지 못했어요. 연결 상태를 확인하고 다시 연결해주세요.')}
  }
 }
 useEffect(()=>{
  const node=audio.current;if(!node)return
  mounted.current=true;node.src=source;node.volume=volume.current/100;setFailed(false);setPlaying(false)
  void play(node)
  return()=>{mounted.current=false;request.current++;node.pause();node.removeAttribute('src');node.load()}
 },[source])
 return <section className="sanctuary-music sanctuary-music-audio" aria-label="예배당 배경 찬양">
  <audio ref={audio} src={source} loop preload="none" onPlaying={()=>{if(!mounted.current)return;setPlaying(true);setFailed(false);setStatus('잔잔한 찬양이 반복해서 흐릅니다.')}} onPause={()=>{if(!mounted.current||!audio.current?.paused)return;request.current++;setPlaying(false);if(!failed)setStatus('찬양을 잠시 멈췄습니다.')}} onError={()=>{if(!mounted.current)return;request.current++;setPlaying(false);setFailed(true);setStatus('음원을 불러오지 못했어요. 연결 상태를 확인하고 다시 연결해주세요.')}}/>
  <div className="sanctuary-music-heading"><div><small>QUIET CCM · ON REPEAT</small><h3>찬양이 머무는 시간</h3></div><button type="button" aria-label={playing?'찬양 일시정지':'찬양 재생'} onClick={()=>{const node=audio.current;if(!node)return;if(playing){request.current++;node.pause()}else{if(failed){node.load();setFailed(false)}void play(node)}}}>{playing?'Ⅱ 일시정지':'▷ 찬양 재생'}</button></div>
  <div className="sanctuary-music-volume"><label>음량<input type="range" aria-label="찬양 음량" min={0} max={100} value={level} onChange={e=>{const value=Number(e.target.value);volume.current=value;setLevel(value);if(audio.current)audio.current.volume=value/100}}/></label><button type="button" onClick={()=>{const node=audio.current;if(!node)return;setFailed(false);node.load();void play(node)}}>다시 연결</button></div>
  <p role="status">{status}</p>
 </section>
}
