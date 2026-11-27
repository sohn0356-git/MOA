import {expect,it} from 'vitest'
import {advanceGardenResident,createGardenResident,gardenHeading} from './gardenMotion'
it('projects the visible front in the same direction as travel in all eight directions',()=>{
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
  const angle=gardenHeading(dx,dy)*Math.PI/180
  const frontX=Math.sin(angle),frontY=Math.sin(9*Math.PI/180)*Math.cos(angle)
  const alignment=(frontX*dx+frontY*dy)/(Math.hypot(frontX,frontY)*Math.hypot(dx,dy))
  expect(alignment).toBeCloseTo(1,8)
 }
})
it('turns while stationary, then advances the actual position at 10 pixels per second',()=>{
 const initial=createGardenResident(()=>.2),turn=advanceGardenResident(initial,.033,300,300,201,()=>.8)
 expect(turn.phase).toBe('turn');expect(turn.moving).toBe(false);expect(turn.x).toBe(initial.x);expect(advanceGardenResident(turn,.033,300,300,300)).toBe(turn)
 const next=advanceGardenResident(turn,.05,300,300,402)
 expect(next.moving).toBe(true);expect(Math.hypot((next.x-turn.x)*3,(next.y-turn.y)*3)).toBeCloseTo(.5,8)
 const heading=next.facing*Math.PI/180,dx=next.x-turn.x,dy=next.y-turn.y
 expect((Math.sin(heading)*dx+Math.sin(9*Math.PI/180)*Math.cos(heading)*dy)/(Math.hypot(Math.sin(heading),Math.sin(9*Math.PI/180)*Math.cos(heading))*Math.hypot(dx,dy))).toBeCloseTo(1,8)
})
it('takes the shortest turn, stops at the destination, and bounds background-frame movement',()=>{
 expect(gardenHeading(-.01,-1,179)).toBeGreaterThan(179)
 const p={...createGardenResident(()=>.5),phase:'walk' as const,goalX:51,goalY:50,x:50,y:50,moving:true}
 const step=advanceGardenResident(p,10,300,300,1000);expect(step.x-p.x).toBeCloseTo(1/6)
 const arrived=advanceGardenResident({...p,x:50.99},.05,300,300,1000);expect(arrived.x).toBe(51);expect(arrived.phase).toBe('rest');expect(arrived.moving).toBe(false)
})
