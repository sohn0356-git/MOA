import { safeSanctuaryPoint, type FloorPoint } from './sanctuaryMovement'
export const avatarSkins=['#e5b58d','#f2d0ac','#bd8965','#80583e']
export const avatarHairs=['#503c34','#272c32','#906444','#c4aa72']
export const avatarShirts=['#71865e','#7495b6','#a384b0','#bb846c','#64737f']
export type AvatarProfile={name:string;skin:number;hair:number;shirt:number}
export type RoomPresence=AvatarProfile & FloorPoint & {uid:string;facing:number;moving:boolean;updatedAt:number}
export type SharedPrayer={id:string;uid:string;name:string;title:string;body:string;createdAt:number;updatedAt:number;answered:boolean}
export const defaultAvatar=(name='나그네'):AvatarProfile=>({name:name.trim().slice(0,24)||'나그네',skin:0,hair:0,shirt:0})
export function normalizeAvatar(raw:unknown,name='나그네'):AvatarProfile{
 const p=raw&&typeof raw==='object'?raw as Record<string,unknown>:{}
 const index=(v:unknown,length:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<length?v:0
 return{name:typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,24):defaultAvatar(name).name,skin:index(p.skin,avatarSkins.length),hair:index(p.hair,avatarHairs.length),shirt:index(p.shirt,avatarShirts.length)}
}
export function onlineMembers(raw:Record<string,Record<string,unknown>>|null,now:number):RoomPresence[]{
 const result:RoomPresence[]=[]
 for(const [uid,connections] of Object.entries(raw||{})){
  const rows=Object.values(connections||{}).filter((v):v is Record<string,unknown>=>!!v&&typeof v==='object').filter(v=>typeof v.updatedAt==='number'&&now-v.updatedAt<65000&&v.updatedAt<=now+10000).sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt))
  const p=rows[0];if(!p)continue
  result.push({...normalizeAvatar(p),...safeSanctuaryPoint(p),uid,facing:typeof p.facing==='number'?p.facing:0,moving:p.moving===true,updatedAt:Number(p.updatedAt)})
 }
 return result
}
export function koreanDayBounds(now:number){const start=Math.floor((now+32400000)/86400000)*86400000-32400000;return{start,end:start+86400000-1}}
