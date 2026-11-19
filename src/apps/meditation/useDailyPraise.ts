import {useEffect,useMemo,useState} from 'react'
import {DAILY_PRAISE_KEY,selectDailyPraise,type DailyPraiseChoice,type LunchPraiseTrack} from './dailyPraise'
function readChoice():DailyPraiseChoice|null{
 try{const p=JSON.parse(localStorage.getItem(DAILY_PRAISE_KEY)||'null');return p&&typeof p.day==='string'&&typeof p.videoId==='string'?{day:p.day,videoId:p.videoId}:null}catch{return null}
}
export function useDailyPraise(tracks:LunchPraiseTrack[],day:string){
 const [choice,setChoice]=useState<DailyPraiseChoice|null>(readChoice)
 const track=useMemo(()=>selectDailyPraise(tracks,day,choice),[tracks,day,choice])
 useEffect(()=>{
  if(!track||(choice?.day===day&&choice.videoId===track.videoId))return
  const next={day,videoId:track.videoId};setChoice(next)
  try{localStorage.setItem(DAILY_PRAISE_KEY,JSON.stringify(next))}catch{/* Daily seeded selection still works without browser storage. */}
 },[day,track,choice])
 return track
}
