import {createContext,useContext,memo} from 'react'
export type CityTimezone='local'|'city'
export const CityTimeContext=createContext<CityTimezone>('local')
export function cityZone(mode:CityTimezone){return mode==='city'?'Asia/Seoul':Intl.DateTimeFormat().resolvedOptions().timeZone}
export function cityDateKey(value:number,mode:CityTimezone){return new Intl.DateTimeFormat('en-CA',{timeZone:cityZone(mode),year:'numeric',month:'2-digit',day:'2-digit'}).format(value)}
const formats=new Map<string,Intl.DateTimeFormat>()
function formatter(zone:string,kind:'absolute'|'short'){const key=zone+kind;let value=formats.get(key);if(!value){value=new Intl.DateTimeFormat(kind==='absolute'?'sv-SE':'ko-KR',kind==='absolute'?{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}:{timeZone:zone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});formats.set(key,value)}return value}
export const CityTime=memo(function CityTime({value}:{value:number}){
 const mode=useContext(CityTimeContext),zone=cityZone(mode)
 const absolute=formatter(zone,'absolute').format(value)
 return <time dateTime={new Date(value).toISOString()} title={absolute+' '+zone+' · UTC '+new Date(value).toISOString()}><span>{formatter(zone,'short').format(value)}</span><details className="city-time-detail"><summary>시간 기준</summary><span>{absolute} · {zone} · UTC {new Date(value).toISOString()}</span></details></time>
})
