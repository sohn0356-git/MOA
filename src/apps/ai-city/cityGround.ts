import {cityBuildings} from './cityBuildings'
import {worldEdges,worldNodes} from './cityWorld'
export type GroundRect={x:number;z:number;width:number;depth:number}
export const cityTrees=[[-47,-9],[-41,5],[-30,-27],[-13,-29],[8,-23],[32,-25],[43,-7],[48,10],[27,29],[-15,32],[-39,29],[-49,23],[15,22],[45,33],[-50,-27],[50,-27],[-6,15],[15,3],[-34,14],[40,3]] as const
const line=(a:{x:number;y:number},b:{x:number;y:number}):GroundRect=>({x:(a.x+b.x)/20-60,z:(a.y+b.y)/20-40,width:Math.max(3.5,Math.abs(a.x-b.x)/10),depth:Math.max(3.5,Math.abs(a.y-b.y)/10)})
const branches=[['hall','plaza'],['post','library'],['press','studio'],['material','cafe'],['tower','west'],['shelf','park']] as const
export const cityPaths:GroundRect[]=[
 ...worldEdges.map(([a,b])=>line(worldNodes[a],worldNodes[b])),
 ...branches.flatMap(([id,node])=>{const b=cityBuildings.find(b=>b.id===id)!;return [line({x:b.x,y:b.z},{x:worldNodes[node].x,y:b.z}),line({x:worldNodes[node].x,y:b.z},worldNodes[node])]}),
 // Pavements around each building connect the roads to its front entrance.
 ...cityBuildings.flatMap(b=>{const x=(b.x-600)/10,z=(b.z-400)/10,dx=b.width/2+2.3,dz=b.depth/2+2.3;return [
  {x,z:z-dz,width:dx*2+3.5,depth:3.5},{x,z:z+dz,width:dx*2+3.5,depth:3.5},
  {x:x-dx,z,width:3.5,depth:dz*2+3.5},{x:x+dx,z,width:3.5,depth:dz*2+3.5},
 ]}),
]
export function isCityGroundWalkable(x:number,z:number){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>72||Math.abs(z)>48)return false
 if(!cityPaths.some(p=>Math.abs(x-p.x)<=p.width/2-.45&&Math.abs(z-p.z)<=p.depth/2-.45))return false
 if(Math.abs(z-(-37+Math.sin(x/13)*2.7))<2.9)return false
 if(cityBuildings.some(b=>Math.abs(x-(b.x-600)/10)<b.width/2+.65&&Math.abs(z-(b.z-400)/10)<b.depth/2+.65))return false
 return !cityTrees.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<1.05)
}
