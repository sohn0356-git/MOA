// @vitest-environment jsdom
import {beforeEach,describe,it,expect} from 'vitest'
import {loadStreet,saveStreet,moveStreet,streetSpawn,streetWalkable,streetCamera,nearbyStreetBuilding} from './cityStreet'
import {cameraBasis} from './city3dMath'
describe('street-level avatar movement and resuming',()=>{
 beforeEach(()=>localStorage.clear())
 it('walks relative to gaze, normalizes diagonal speed and stops at solid walls and city bounds',()=>{
  const straight=moveStreet(streetSpawn,1,0,.1),diagonal=moveStreet(streetSpawn,1,1,.1)
  expect(straight.z).toBeCloseTo(6.2)
  expect(Math.hypot(diagonal.x-streetSpawn.x,diagonal.z-streetSpawn.z)).toBeCloseTo(1.8)
  expect(moveStreet({...streetSpawn,z:3,yaw:Math.PI/2},1,0,.1).x).toBeCloseTo(-4.8)
  let p={...streetSpawn};for(let i=0;i<100;i++)p=moveStreet(p,1,0,.1)
  expect(p.z).toBeGreaterThan(1.64);expect(streetWalkable(p.x,p.z)).toBe(true)
  expect(streetWalkable(72,8)).toBe(false)
  expect(nearbyStreetBuilding(p)?.id).toBe('plaza')
 })
 it('blocks grass, water and trees and never crosses a road edge at high speed',()=>{
  expect(streetWalkable(12,8)).toBe(false)
  expect(streetWalkable(0,-37)).toBe(false)
  expect(streetWalkable(-6,15)).toBe(false)
  let p={...streetSpawn};for(let i=0;i<200;i++){p=moveStreet(p,0,1,.1);expect(streetWalkable(p.x,p.z)).toBe(true)}
  expect(p.x).toBeLessThan(-1.69)
  const capped=moveStreet(streetSpawn,1,0,999);expect(capped.z).toBeCloseTo(6.2)
 })
 it('resumes exact location and direction separately for each avatar',()=>{
  const p={x:-3,z:8,yaw:1.2,pitch:.3};saveStreet('ai01',p)
  expect(loadStreet('ai01')).toEqual(p);expect(loadStreet('ai02')).toEqual(streetSpawn)
  const next=moveStreet(p,0,1,.1);saveStreet('ai01',next);expect(loadStreet('ai01')).toEqual(next)
 })
 it('recovers safely from malformed, nonfinite, off-map and inside-building saves',()=>{
  for(const value of ['{','null',JSON.stringify({x:999,z:0,yaw:0,pitch:0}),JSON.stringify({x:-3,z:-3,yaw:0,pitch:0}),JSON.stringify({x:0,z:8,yaw:'bad',pitch:0})]){
   localStorage.setItem('ai-city:street:v1:ai01',value);expect(loadStreet('ai01')).toEqual(streetSpawn)
  }
 })
 it('looks horizontally from avatar eye height rather than orbiting overhead',()=>{
  const camera=streetCamera(streetSpawn),basis=cameraBasis(camera)
  expect(basis.eye).toEqual([-3,2.65,8]);expect(basis.forward).toEqual([0,0,-1])
  expect(cameraBasis(streetCamera({...streetSpawn,yaw:Math.PI/2})).forward[0]).toBeCloseTo(-1)
 })
})
