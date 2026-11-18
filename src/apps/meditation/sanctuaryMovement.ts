export type FloorPoint={x:number;z:number}
export type WalkDirection='north'|'south'|'west'|'east'
export const sanctuarySpawn:FloorPoint={x:0,z:.94}
export const sanctuarySeatPoints:FloorPoint[]=[{x:-.56,z:.27},{x:.56,z:.27},{x:-.49,z:.77},{x:.49,z:.77}]
export const sanctuaryPrayerBoxPoint:FloorPoint={x:.93,z:.14}
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
export function sanctuarySegmentClear(a:FloorPoint,b:FloorPoint):boolean {
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.009))
 for(let i=0;i<=steps;i++){const t=i/steps;if(!isSanctuaryWalkable({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false}
 return true
}
export function sanctuaryPath(start:FloorPoint,target:FloorPoint):FloorPoint[] {
 if(!isSanctuaryWalkable(start))return[]
 if(isSanctuaryWalkable(target)&&sanctuarySegmentClear(start,target))return[{...target}]
 const size=41,total=size*size
 const point=(index:number)=>({x:-.95+(index%size)*1.9/(size-1),z:.06+Math.floor(index/size)*.9/(size-1)})
 const points=Array.from({length:total},(_,i)=>point(i)),available=points.map(isSanctuaryWalkable)
 function closest(p:FloorPoint,visible:boolean){let best=-1,distance=Infinity
  for(let i=0;i<total;i++){if(!available[i])continue;const q=points[i],d=Math.hypot(p.x-q.x,p.z-q.z);if(d<distance&&(!visible||sanctuarySegmentClear(p,q))){best=i;distance=d}}
  return best
 }
 const from=closest(start,true),to=closest(target,isSanctuaryWalkable(target));if(from<0||to<0)return[]
 const goal=isSanctuaryWalkable(target)?target:points[to]
 const g=new Float64Array(total).fill(Infinity),parents=new Int32Array(total).fill(-1),closed=new Uint8Array(total)
 const heap:{id:number;score:number}[]=[]
 function push(id:number,score:number){let i=heap.length;heap.push({id,score});while(i>0){const p=(i-1)>>1;if(heap[p].score<=score)break;heap[i]=heap[p];i=p}heap[i]={id,score}}
 function pop(){const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c}heap[i]=last}return first.id}
 g[from]=0;parents[from]=from;push(from,Math.hypot(points[from].x-goal.x,points[from].z-goal.z))
 while(heap.length){const at=pop();if(closed[at])continue;closed[at]=1;if(at===to)break
  const col=at%size,row=Math.floor(at/size)
  for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
   const x=col+dx,z=row+dz;if(x<0||x>=size||z<0||z>=size)continue
   const next=z*size+x;if(!available[next]||closed[next]||!sanctuarySegmentClear(points[at],points[next]))continue
   const cost=g[at]+Math.hypot(points[at].x-points[next].x,points[at].z-points[next].z)
   if(cost>=g[next])continue;g[next]=cost;parents[next]=at;push(next,cost+Math.hypot(points[next].x-goal.x,points[next].z-goal.z))
  }
 }
 if(parents[to]===-1)return[]
 const raw:FloorPoint[]=[goal];for(let at=to;at!==from;at=parents[at])raw.push(points[at]);raw.push(points[from],start);raw.reverse()
 const result:FloorPoint[]=[];let anchor=0
 while(anchor<raw.length-1){let next=raw.length-1;while(next>anchor+1&&!sanctuarySegmentClear(raw[anchor],raw[next]))next--;result.push(raw[next]);anchor=next}
 return result
}
