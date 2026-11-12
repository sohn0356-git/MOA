export type FloorPoint={x:number;z:number}
export type WalkDirection='north'|'south'|'west'|'east'
export const sanctuarySpawn:FloorPoint={x:0,z:.94}
export const sanctuarySeatPoints:FloorPoint[]=[{x:-.56,z:.27},{x:.56,z:.27},{x:-.49,z:.77},{x:.49,z:.77}]
const rows=[.045,.205,.365,.525,.685,.845]
export function isSanctuaryWalkable(p:FloorPoint) {
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>.96||p.z<.06||p.z>.97)return false
 if(Math.abs(p.x)<.2||Math.abs(p.x)>.9)return true
 return !rows.some(row=>Math.abs(row-p.z)<.045)
}
export function safeSanctuaryPoint(raw:unknown):FloorPoint {
 const p=raw&&typeof raw==='object'?raw as FloorPoint:sanctuarySpawn
 return isSanctuaryWalkable(p)?{x:p.x,z:p.z}:{...sanctuarySpawn}
}
export function projectSanctuaryPoint(p:FloorPoint) {
 return {x:320+p.x*(183+p.z*137),y:270+p.z*190}
}
export function floorPointFromScene(x:number,y:number):FloorPoint|null {
 const z=(y-270)/190,px=(x-320)/(183+z*137)
 if(z<.06||z>.97||Math.abs(px)>.96)return null
 return{x:px,z}
}
export function stepSanctuaryPoint(start:FloorPoint,dx:number,dz:number):FloorPoint {
 const next={x:start.x+dx,z:start.z+dz}
 if(isSanctuaryWalkable(next))return next
 if(isSanctuaryWalkable({x:next.x,z:start.z}))return{x:next.x,z:start.z}
 if(isSanctuaryWalkable({x:start.x,z:next.z}))return{x:start.x,z:next.z}
 return start
}
export function sanctuaryPath(start:FloorPoint,target:FloorPoint):FloorPoint[] {
 const size=41
 const point=(index:number)=>({x:-.95+(index%size)*1.9/(size-1),z:.06+Math.floor(index/size)*.9/(size-1)})
 const available=Array.from({length:size*size},(_,i)=>isSanctuaryWalkable(point(i)))
 const closest=(p:FloorPoint)=>{
  let best=-1,dist=Infinity
  for(let i=0;i<available.length;i++){if(!available[i])continue;const q=point(i),d=(p.x-q.x)**2+(p.z-q.z)**2;if(d<dist){best=i;dist=d}}
  return best
 }
 const from=closest(start),to=closest(target)
 if(from<0||to<0)return[]
 const parents=new Int32Array(size*size).fill(-1),queue=[from];parents[from]=from
 for(let head=0;head<queue.length;head++){
  const at=queue[head];if(at===to)break
  const col=at%size,row=Math.floor(at/size)
  for(const [cx,cz] of [[0,-1],[0,1],[-1,0],[1,0]]){
   const x=col+cx,z=row+cz;if(x<0||x>=size||z<0||z>=size)continue
   const next=z*size+x;if(!available[next]||parents[next]!==-1)continue
   parents[next]=at;queue.push(next)
  }
 }
 if(parents[to]===-1)return[]
 const result:FloorPoint[]=[]
 for(let at=to;at!==from;at=parents[at])result.push(point(at))
 result.push(point(from));return result.reverse()
}
