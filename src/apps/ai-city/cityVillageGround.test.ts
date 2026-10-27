import {describe,it,expect} from 'vitest'
import {isVillageWalkable,moveVillage,villageResidents,villageStart,villageProjection} from './cityVillageGround'
describe('illustration foot collision',()=>{
 it('places every resident and spawn on pavement',()=>{for(const p of [...villageResidents,villageStart])expect(isVillageWalkable(p),JSON.stringify(p)).toBe(true)})
 it('blocks canal and buildings while permitting the bridge',()=>{for(const p of [{x:50,y:53},{x:62,y:48},{x:10,y:12},{x:90,y:84}])expect(isVillageWalkable(p)).toBe(false);expect(isVillageWalkable({x:55,y:32})).toBe(true)})
 it('cannot tunnel across water in one long frame',()=>{const end=moveVillage({x:34,y:37},30,15);expect(isVillageWalkable(end)).toBe(true);expect(end.x).toBeLessThan(45)})
 it('keeps a sustained walk on the footpaths',()=>{let p=villageStart;for(let i=0;i<500;i++){p=moveVillage(p,.2,-.3);expect(isVillageWalkable(p)).toBe(true)}})
 it('projects background and feet identically at mobile and desktop sizes',()=>{expect(villageProjection({x:50,y:50},360,600)).toEqual({left:180,top:300});expect(villageProjection({x:60,y:50},1200,800)).toEqual({left:720,top:400});expect(villageProjection({x:60,y:50},360,600,1.5)).toEqual({left:315,top:300})})
})
