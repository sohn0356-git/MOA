import {describe,it,expect} from 'vitest'
import {cityBuildings} from './cityBuildings'
import {isCityGroundWalkable} from './cityGround'
describe('walkable city paths',()=>{
 it('connects the spawn to every existing building entrance without crossing forbidden ground',()=>{
  const key=(x:number,z:number)=>x+','+z,queue:[number,number][]=[[-3,8]],seen=new Set([key(-3,8)])
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz]of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!seen.has(k)&&isCityGroundWalkable(nx,nz)){seen.add(k);queue.push([nx,nz])}}}
  for(const b of cityBuildings){const x=(b.x-600)/10,z=(b.z-400)/10+b.depth/2+1.2;expect(queue.some(([px,pz])=>Math.hypot(px-x,pz-z)<1.2),b.name+' entrance must stay reachable').toBe(true)}
 })
})
