import {cityBuildings,type CityBuilding} from './cityBuildings'
import type {CityCamera} from './city3dMath'
export type StreetPosition={x:number;z:number;yaw:number;pitch:number}
export const streetSpawn:StreetPosition={x:-3,z:8,yaw:0,pitch:0}
const key=(id:string)=>'ai-city:street:v1:'+id
export function streetWalkable(x:number,z:number){
 return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=72&&Math.abs(z)<=48&&!cityBuildings.some(b=>Math.abs(x-(b.x-600)/10)<b.width/2+.65&&Math.abs(z-(b.z-400)/10)<b.depth/2+.65)
}
export function moveStreet(p:StreetPosition,forward:number,side:number,seconds:number):StreetPosition{
 const length=Math.max(1,Math.hypot(forward,side)),distance=Math.min(.1,Math.max(0,seconds))*6
 const dx=(-Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side)/length*distance,dz=(-Math.cos(p.yaw)*forward-Math.sin(p.yaw)*side)/length*distance
 let {x,z}=p
 if(streetWalkable(x+dx,z))x+=dx
 if(streetWalkable(x,z+dz))z+=dz
 return {...p,x,z}
}
export function loadStreet(id:string):StreetPosition{
 try{const p=JSON.parse(localStorage.getItem(key(id))??'null');if(p&&streetWalkable(p.x,p.z)&&Number.isFinite(p.yaw)&&Number.isFinite(p.pitch))return {x:p.x,z:p.z,yaw:p.yaw%(Math.PI*2),pitch:Math.max(-.65,Math.min(.65,p.pitch))}}catch{/* Storage unavailable or old/corrupt record. */}
 return {...streetSpawn}
}
export function saveStreet(id:string,p:StreetPosition){
 try{localStorage.setItem(key(id),JSON.stringify(p))}catch{/* Exploration remains available without storage. */}
}
export function streetCamera(p:StreetPosition):CityCamera{
 const eye:[number,number,number]=[p.x,2.65,p.z]
 return {yaw:p.yaw,pitch:p.pitch,distance:1,eye,target:[p.x-Math.sin(p.yaw)*Math.cos(p.pitch),2.65+Math.sin(p.pitch),p.z-Math.cos(p.yaw)*Math.cos(p.pitch)]}
}
export function nearbyStreetBuilding(p:StreetPosition):CityBuilding|undefined{
 return cityBuildings.find(b=>Math.hypot(p.x-(b.x-600)/10,p.z-((b.z-400)/10+b.depth/2+1.2))<4)
}
