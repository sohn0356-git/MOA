// Public gallery only. Never persist private entries or account-specific data here.
const KEY='moa.public-feed.v1'
const MAX_AGE=6*60*60*1000
export function readPublicFeedCache<T>():T[]{
 try{
  const value=JSON.parse(localStorage.getItem(KEY)||'null')
  if(!value||!Number.isFinite(value.savedAt)||Date.now()-value.savedAt>MAX_AGE||value.savedAt>Date.now()||!Array.isArray(value.photos))return []
  return value.photos.filter((photo:Record<string,unknown>)=>photo&&typeof photo.id==='string'&&typeof photo.caption==='string'&&typeof photo.imageUrl==='string').slice(0,48)
 }catch{return []}
}
export function writePublicFeedCache<T>(photos:T[]){
 try{const value=JSON.stringify({savedAt:Date.now(),photos:photos.slice(0,48)});if(value.length<750_000)localStorage.setItem(KEY,value);else localStorage.removeItem(KEY)}catch{/* A full or unavailable cache must not block the live gallery. */}
}
