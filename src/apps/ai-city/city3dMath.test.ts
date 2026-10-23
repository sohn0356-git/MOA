import {describe,it,expect} from 'vitest'
import {cityBuildings} from './cityBuildings'
import {defaultCityCamera,cameraMatrix,cameraBasis,projectPoint,pickCityBuilding,rayBox,type Vec3} from './city3dMath'
import {buildCityScenery} from './city3dRenderer'
describe('3D city projection and picking',()=>{
 it('projects each building into an exact ray hit from an unobstructed overhead camera',()=>{
  for(const b of cityBuildings){
   const x=(b.x-600)/10,z=(b.z-400)/10,camera={...defaultCityCamera,pitch:1.2,distance:55,target:[x,0,z] as Vec3}
   const center:Vec3=[x,b.height*.5,z],p=projectPoint(center,cameraMatrix(camera,1.5))
   expect(p.visible).toBe(true)
   expect(pickCityBuilding(cityBuildings,camera,p.x,p.y,1.5)?.id).toBe(b.id)
  }
 })
 it('uses depth to select the nearest solid object and rejects rays behind or outside a box',()=>{
  expect(rayBox([0,2,10],[0,0,-1],[-1,0,-1],[1,4,1])).toBe(9)
  expect(rayBox([3,2,10],[0,0,-1],[-1,0,-1],[1,4,1])).toBeNull()
  expect(rayBox([0,2,10],[0,0,1],[-1,0,-1],[1,4,1])).toBeNull()
 })
 it('rotates the perspective without changing building destinations',()=>{
  const target:Vec3=[20,3,10],first=projectPoint(target,cameraMatrix(defaultCityCamera,2)),second=projectPoint(target,cameraMatrix({...defaultCityCamera,yaw:1.1},2))
  expect(Math.abs(first.x-second.x)).toBeGreaterThan(.01)
  expect(Math.hypot(...cameraBasis(defaultCityCamera).forward)).toBeCloseTo(1)
  expect(new Set(cityBuildings.map(b=>b.view)).size).toBe(12)
  expect(cityBuildings.find(b=>b.id==='hall')?.view).toBe('suggestion')
 })
 it('builds finite world-space triangles with normals and bounded material colors',()=>{
  const mesh=buildCityScenery();expect(mesh.length).toBeGreaterThan(1000);expect(mesh.length%27).toBe(0)
  for(let i=0;i<mesh.length;i+=9){for(let j=0;j<9;j++)expect(Number.isFinite(mesh[i+j])).toBe(true);expect(Math.hypot(mesh[i+3],mesh[i+4],mesh[i+5])).toBeCloseTo(1);for(let j=6;j<9;j++){expect(mesh[i+j]).toBeGreaterThanOrEqual(0);expect(mesh[i+j]).toBeLessThanOrEqual(1)}}
 })
})
