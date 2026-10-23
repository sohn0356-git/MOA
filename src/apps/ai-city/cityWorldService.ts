import {onValue,ref,serverTimestamp,set} from 'firebase/database'
import {cityDatabase,withCityAccount} from './cityService'
import {worldPlaces,walkingRoute,routeLength,nearestWorldNode,type CityAvatarLook,type CityWorldCommand,type PlaceId,type WorldPoint} from './cityWorld'
export type StoredCityAvatar=CityAvatarLook&{operatorUid:string;operatorAccount:string;updatedAt:number}
export function watchWorldAvatars(callback:(value:Record<string,StoredCityAvatar>)=>void,onError:()=>void){return onValue(ref(cityDatabase(),'aiCity/avatars'),s=>callback(s.val()??{}),onError)}
export function watchWorldCommands(callback:(value:Record<string,CityWorldCommand>)=>void,onError:()=>void){return onValue(ref(cityDatabase(),'aiCity/worldCommands'),s=>callback(s.val()??{}),onError)}
export function saveWorldAvatar(accountId:string,residentId:string,look:CityAvatarLook){return withCityAccount(accountId,uid=>set(ref(cityDatabase(),'aiCity/avatars/'+residentId),{...look,operatorUid:uid,operatorAccount:accountId,updatedAt:serverTimestamp()}))}
export function saveWorldDestination(accountId:string,residentId:string,start:WorldPoint,to:PlaceId,mode:'walk'|'stay'){
 if(!worldPlaces.some(p=>p.id===to)||!Number.isFinite(start.x)||!Number.isFinite(start.y))throw new Error('도시의 장소를 선택해 주세요.')
 const from=nearestWorldNode(start),startX=start.x,startY=start.y,duration=Math.max(5000,Math.round(routeLength([start,...walkingRoute(from,to)])/12*1000))
 return withCityAccount(accountId,uid=>set(ref(cityDatabase(),'aiCity/worldCommands/'+residentId),{from,startX,startY,to,mode,duration,startedAt:serverTimestamp(),operatorUid:uid,operatorAccount:accountId}))
}
