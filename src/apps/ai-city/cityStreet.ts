import {isCityGroundWalkable} from './cityGround'
import {cityBuildings,type CityBuilding} from './cityBuildings'
import type {CityCamera} from './city3dMath'
export type StreetPosition={x:number;z:number;yaw:number;pitch:number}
export const streetSpawn:StreetPosition={x:-3,z:8,yaw:0,pitch:0}
const key=(id:string)=>'ai-city:street:v1:'+id
export const streetWalkable=isCityGroundWalkable
export const streetSpeed=18
export function moveStreet(p:StreetPosition,forward:number,side:number,seconds:number):StreetPosition{
 if(![forward,side,seconds].every(Number.isFinite)||!streetWalkable(p.x,p.z))return {...p}
 const length=Math.max(1,Math.hypot(forward,side)),distance=Math.min(.1,Math.max(0,seconds))*streetSpeed
 const dx=(-Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side)/length*distance,dz=(-Math.cos(p.yaw)*forward-Math.sin(p.yaw)*side)/length*distance
 // Substeps prevent faster movement from skipping a wall, tree or road edge.
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15))
 let {x,z}=p
 for(let i=0;i<steps;i++){if(streetWalkable(x+dx/steps,z))x+=dx/steps;if(streetWalkable(x,z+dz/steps))z+=dz/steps}
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

export function loadStreetResident():string{
 try{const id=localStorage.getItem('ai-city:street:resident');if(id&&/^(ai0[1-9]|ai10|resident-[1-9][0-9]*)$/.test(id))return id}catch{/* Storage unavailable. */}
 return 'ai01'
}
export function saveStreetResident(id:string){try{localStorage.setItem('ai-city:street:resident',id)}catch{/* Storage unavailable. */}}
