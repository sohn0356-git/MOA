import {useEffect,useState} from 'react'
import './AppLaunchScreen.css'
export type StartupContentState={owner:string;scripture:boolean;entries:boolean;feed:boolean}
export function AppLaunchScreen({authReady,activityReady,content,signingIn,onContinue}:{authReady:boolean;activityReady:boolean;content:StartupContentState|null;signingIn:boolean;onContinue:()=>void}){
 const [canSkip,setCanSkip]=useState(false),[slow,setSlow]=useState(false)
 useEffect(()=>{const skip=setTimeout(()=>setCanSkip(true),1600),hint=setTimeout(()=>setSlow(true),3500),limit=setTimeout(onContinue,8000);return()=>{clearTimeout(skip);clearTimeout(hint);clearTimeout(limit)}},[onContinue])
 const account=authReady&&activityReady
 const progress=15+(authReady?30:0)+(activityReady?15:0)+(account&&content?.scripture?15:0)+(account&&content?.entries?15:0)+(account&&content?.feed?10:0)
 const message=!authReady?(signingIn?'구글 계정과 인사하고 있어요':'로그인 상태를 확인하고 있어요'):!activityReady?'나의 활동 아이디를 챙기고 있어요':!content?.scripture?'오늘 마음에 담을 말씀을 펼쳐요':!content?.entries||!content.feed?'이웃의 나눔과 내 이야기를 준비해요':'준비됐어요. 함께 들어가요!'
 return <section className="moa-launch" aria-label={signingIn?'구글 로그인 준비':'모아 시작 준비'} aria-live="polite">
  <div className="moa-launch-inner">
   <div className="moa-launch-art"><span className="moa-launch-spark spark-one" aria-hidden="true">✦</span><img src={`${import.meta.env.BASE_URL}icons/chapel-v1-192.png`} width="192" height="192" alt=""/><span className="moa-launch-spark spark-two" aria-hidden="true">✧</span><span className="moa-launch-pixel pixel-one"/><span className="moa-launch-pixel pixel-two"/></div>
   <span className="moa-launch-eyebrow">작은 마음들이 모이는 곳</span><h1>모아</h1><p className="moa-launch-meaning">묵상 · 선교 · 교제</p>
   <div className="moa-launch-progress"><div><span>{message}</span><small>{progress}%</small></div><progress max="100" value={progress} aria-label="앱 준비 진행률"/></div>
   <ol className="moa-launch-steps"><li data-done={account}><span>{account?'✓':'·'}</span>계정 확인</li><li data-done={account&&!!content?.scripture}><span>{account&&content?.scripture?'✓':'·'}</span>말씀 펼치기</li><li data-done={account&&!!content?.entries&&!!content.feed}><span>{account&&content?.entries&&content.feed?'✓':'·'}</span>나눔 준비</li></ol>
   <p className="moa-launch-caption">{slow?'조금 천천히 도착하고 있어요. 먼저 둘러봐도 괜찮아요.':'마음이 쉬어갈 자리를 준비하고 있어요.'}</p>
   {canSkip&&<button className="moa-launch-skip" type="button" onClick={onContinue}>먼저 둘러보기 <span aria-hidden="true">↗</span></button>}
  </div>
 </section>
}
