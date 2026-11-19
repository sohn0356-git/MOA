import {useEffect,useMemo,useRef,useState} from 'react'
import {extractYouTubeVideoId} from './faithUtils'
import type {LunchPraiseTrack} from './dailyPraise'
type Player={setVolume:(volume:number)=>void;playVideo:()=>void;pauseVideo:()=>void;destroy:()=>void}
type YouTube={Player:new(element:HTMLElement,options:Record<string,unknown>)=>Player}
declare global{interface Window{YT?:YouTube;onYouTubeIframeAPIReady?:()=>void}}
let api:Promise<YouTube>|null=null
function loadPlayer(){
 if(window.YT?.Player)return Promise.resolve(window.YT)
 if(api)return api
 api=new Promise<YouTube>((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady
  const timeout=window.setTimeout(()=>{api=null;reject(new Error('player timeout'))},15000)
  window.onYouTubeIframeAPIReady=()=>{previous?.();window.clearTimeout(timeout);if(window.YT)resolve(window.YT)}
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true
  script.onerror=()=>{window.clearTimeout(timeout);api=null;script.remove();reject(new Error('player unavailable'))}
  document.head.append(script)
 });return api
}
export function SanctuaryMusic({tracks}:{tracks:LunchPraiseTrack[]}){
 const ids=useMemo(()=>[...new Set(tracks.filter(t=>t.active).map(t=>extractYouTubeVideoId(t.videoId)).filter((v):v is string=>!!v))].slice(0,100),[tracks])
 const playlist=ids.join(',')
 const mount=useRef<HTMLDivElement>(null),player=useRef<Player|null>(null),volume=useRef(20)
 const [playing,setPlaying]=useState(false),[level,setLevel]=useState(20),[status,setStatus]=useState('찬양을 준비하고 있어요.'),[retry,setRetry]=useState(0),[ready,setReady]=useState(false)
 useEffect(()=>{
  if(!playlist||!mount.current)return
  let live=true,instance:Player|null=null
  setReady(false);setPlaying(false);setStatus('찬양을 준비하고 있어요.')
  const node=document.createElement('div');mount.current.replaceChildren(node)
  void loadPlayer().then(YT=>{
   if(!live)return
   instance=new YT.Player(node,{width:'100%',height:'210',videoId:playlist.split(',')[0],playerVars:{autoplay:1,playsinline:1,loop:1,playlist,controls:1,origin:location.origin},events:{
    onReady:(event:{target:Player})=>{if(!live)return;player.current=event.target;event.target.setVolume(volume.current);setReady(true);setStatus('재생되지 않으면 재생 버튼을 눌러주세요.');event.target.playVideo()},
    onStateChange:(event:{data:number})=>{if(!live)return;setPlaying(event.data===1);if(event.data===1)setStatus('등록된 찬양을 순서대로 반복 재생합니다.')},
    onAutoplayBlocked:()=>{if(live){setPlaying(false);setStatus('소리를 켜려면 찬양 재생을 눌러주세요.')}},
    onError:()=>{if(live){setPlaying(false);setStatus('이 찬양을 재생할 수 없어요. 영상의 다음 곡을 선택하거나 다시 연결해주세요.')}}
   }})
  }).catch(()=>{if(live)setStatus('찬양 연결을 확인해주세요. 다시 연결할 수 있어요.')})
  return()=>{live=false;player.current=null;instance?.destroy()}
 },[playlist,retry])
 if(!playlist)return <div className="sanctuary-music-empty">찬양 목록이 준비되면 이곳에서 계속 이어 들을 수 있어요.</div>
 return <section className="sanctuary-music" aria-label="예배당 배경 찬양">
  <div className="sanctuary-music-heading"><div><small>PRAISE · ON REPEAT</small><h3>찬양이 머무는 시간</h3></div><button type="button" disabled={!ready} aria-label={playing?'찬양 일시정지':'찬양 재생'} onClick={()=>{if(playing)player.current?.pauseVideo();else player.current?.playVideo()}}>{playing?'Ⅱ 일시정지':'▷ 찬양 재생'}</button></div>
  <div className="sanctuary-music-video" ref={mount}/>
  <div className="sanctuary-music-volume"><label>음량<input type="range" aria-label="찬양 음량" min={0} max={100} value={level} onChange={e=>{const value=Number(e.target.value);volume.current=value;setLevel(value);player.current?.setVolume(value)}}/></label><button type="button" onClick={()=>setRetry(n=>n+1)}>다시 연결</button></div>
  <p role="status">{status}</p>
 </section>
}
