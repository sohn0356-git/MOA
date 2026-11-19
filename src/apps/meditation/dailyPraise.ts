import {extractYouTubeVideoId} from './faithUtils'
export type LunchPraiseTrack={id:string;active:boolean;artist:string;title:string;videoId:string;youtubeUrl:string}
export const DAILY_PRAISE_KEY='moa.faith.dailyPraise.v1'
export type DailyPraiseChoice={day:string;videoId:string}
export function normalizeLunchPraiseTracks(value:unknown):LunchPraiseTrack[]{
 if(!value||typeof value!=='object')return[]
 const videos=new Map<string,LunchPraiseTrack>()
 const entries=Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a<b?-1:a>b?1:0)
 for(const [id,item] of entries){
  if(!item||typeof item!=='object')continue
  const data=item as Record<string,unknown>;if(data.active===false)continue
  const candidates=[data.videoId,data.youtubeUrl,data.videoUrl,data.audioUrl]
  let videoId:string|null=null
  for(const candidate of candidates){if(typeof candidate==='string'){videoId=extractYouTubeVideoId(candidate);if(videoId)break}}
  if(!videoId||videos.has(videoId))continue
  videos.set(videoId,{id,active:true,artist:typeof data.artist==='string'?data.artist:'',title:typeof data.title==='string'?data.title:'오늘의 찬송',videoId,youtubeUrl:'https://www.youtube.com/watch?v='+videoId})
 }
 return [...videos.values()].sort((a,b)=>a.videoId<b.videoId?-1:a.videoId>b.videoId?1:0)
}
export function selectDailyPraise(tracks:LunchPraiseTrack[],day:string,choice?:DailyPraiseChoice|null):LunchPraiseTrack|null{
 const pool=tracks.filter(p=>p.active&&!!extractYouTubeVideoId(p.videoId))
 if(!pool.length)return null
 const previous=choice?.day===day?pool.find(p=>p.videoId===choice.videoId):null
 if(previous)return previous
 const unique=[...new Map(pool.map(p=>[p.videoId,p])).values()].sort((a,b)=>a.videoId<b.videoId?-1:a.videoId>b.videoId?1:0)
 let seed=2166136261
 for(const char of day)seed=Math.imul(seed^char.charCodeAt(0),16777619)
 let random=(seed+0x6d2b79f5)|0
 random=Math.imul(random^(random>>>15),random|1)
 random^=random+Math.imul(random^(random>>>7),random|61)
 const fraction=((random^(random>>>14))>>>0)/4294967296
 return unique[Math.floor(fraction*unique.length)]
}
