import {describe,it,expect} from 'vitest'
import {villageAreas,villageAreaIds,villageGates,villageGateAt,residentVillageArea} from './cityVillageAreas'
import {isVillageWalkable,moveVillage} from './cityVillageGround'
describe('connected village maps',()=>{
 it('has safe gates, arrivals, spawns and resident feet in every district',()=>{
  for(const id of villageAreaIds){expect(isVillageWalkable(villageAreas[id].start,id)).toBe(true);for(const p of villageAreas[id].residents)expect(isVillageWalkable(p,id),id+JSON.stringify(p)).toBe(true)}
  for(const gate of villageGates){expect(isVillageWalkable(gate.at,gate.from),gate.id).toBe(true);expect(isVillageWalkable(gate.arrival,gate.to),gate.id).toBe(true);expect(villageGateAt(gate.to,gate.arrival),gate.id+' must not bounce').toBeUndefined()}
 })
 it('connects each district to both others and detects walked-through exits',()=>{for(const id of villageAreaIds)expect(new Set(villageGates.filter(g=>g.from===id).map(g=>g.to)).size).toBe(2);for(const g of villageGates)expect(villageGateAt(g.from,g.at)?.to).toBe(g.to)})
 it('keeps courtyard walkers outside buildings and planting',()=>{for(const id of ['garden','atelier'] as const){expect(isVillageWalkable({x:5,y:5},id)).toBe(false);let p={x:50,y:50};for(let i=0;i<100;i++)p=moveVillage(p,-1,0,id);expect(p.x).toBeGreaterThan(10);expect(isVillageWalkable(p,id)).toBe(true)}})
 it('keeps the painter in the studio district and nature work in the garden',()=>{expect(residentVillageArea('resident-22')).toBe('atelier');expect(residentVillageArea('ai07')).toBe('garden')})
})
