import {describe,it,expect} from 'vitest'
import {sanctuarySpawn,sanctuarySeatPoints,sanctuaryPath,isSanctuaryWalkable,safeSanctuaryPoint,stepSanctuaryPoint,projectSanctuaryPoint,floorPointFromScene} from './sanctuaryMovement'
describe('sanctuary floor',()=>{
 it('routes from the entrance to every pew through walkable spaces',()=>{for(const seat of sanctuarySeatPoints){const route=sanctuaryPath(sanctuarySpawn,seat);expect(route.length).toBeGreaterThan(2);expect(route.every(isSanctuaryWalkable)).toBe(true);for(let i=1;i<route.length;i++)expect(Math.hypot(route[i].x-route[i-1].x,route[i].z-route[i-1].z)).toBeLessThan(.05)}})
 it('blocks pews and walls and rejects damaged saved positions',()=>{expect(stepSanctuaryPoint({x:.5,z:.76},0,.08)).toEqual({x:.5,z:.76});expect(stepSanctuaryPoint({x:.95,z:.94},.1,0)).toEqual({x:.95,z:.94});expect(safeSanctuaryPoint({x:NaN,z:1})).toEqual(sanctuarySpawn)})
 it('maps taps back onto the same floor location',()=>{const p={x:.3,z:.5},screen=projectSanctuaryPoint(p),back=floorPointFromScene(screen.x,screen.y);expect(back?.x).toBeCloseTo(p.x);expect(back?.z).toBeCloseTo(p.z);expect(floorPointFromScene(320,10)).toBeNull()})
})
