import {describe,it,expect} from 'vitest'
import {sanctuarySpawn,sanctuarySeatPoints,sanctuaryPrayerBoxPoint,sanctuaryPath,sanctuarySegmentClear,isSanctuaryWalkable,safeSanctuaryPoint,stepSanctuaryPoint,projectSanctuaryPoint,floorPointFromScene} from './sanctuaryMovement'
describe('sanctuary floor routes',()=>{
 it('reaches exact seats and the prayer box without passing through pews',()=>{
  for(const start of [sanctuarySpawn,...sanctuarySeatPoints,sanctuaryPrayerBoxPoint])for(const target of [...sanctuarySeatPoints,sanctuaryPrayerBoxPoint]){
   const route=sanctuaryPath(start,target);expect(route.length).toBeGreaterThan(0);expect(route.at(-1)).toEqual(target)
   let previous=start;for(const point of route){expect(isSanctuaryWalkable(point)).toBe(true);expect(sanctuarySegmentClear(previous,point)).toBe(true);previous=point}
  }
 })
 it('uses one straight segment for an unobstructed aisle instead of tiny grid steps',()=>{expect(sanctuaryPath(sanctuarySpawn,{x:0,z:.2})).toEqual([{x:0,z:.2}])})
 it('blocks pews/walls and rejects damaged saved positions',()=>{expect(stepSanctuaryPoint({x:.5,z:.76},0,.08)).toEqual({x:.5,z:.76});expect(stepSanctuaryPoint({x:.95,z:.94},.1,0)).toEqual({x:.95,z:.94});expect(safeSanctuaryPoint({x:NaN,z:1})).toEqual(sanctuarySpawn);expect(sanctuaryPath(sanctuarySpawn,{x:NaN,z:0})).toEqual([])})
 it('maps taps back onto the same floor location',()=>{const p={x:.3,z:.5},s=projectSanctuaryPoint(p),back=floorPointFromScene(s.x,s.y);expect(back?.x).toBeCloseTo(p.x);expect(back?.z).toBeCloseTo(p.z);expect(floorPointFromScene(320,10)).toBeNull()})
})
