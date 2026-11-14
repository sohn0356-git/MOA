import {describe,it,expect} from 'vitest'
import {onlineMembers,normalizeAvatar,koreanDayBounds} from './sanctuaryCommunity'
describe('shared sanctuary',()=>{
 it('deduplicates tabs and rejects stale or invalid presence',()=>{const p={name:'하늘',skin:1,hair:2,shirt:3,x:.1,z:.9,updatedAt:99900};const members=onlineMembers({alice:{one:p,two:{...p,updatedAt:99999,name:'새 이름'}},bob:{old:{...p,updatedAt:1000}},eve:{future:{...p,updatedAt:999999}}},100000);expect(members).toHaveLength(1);expect(members[0].name).toBe('새 이름')})
 it('uses Korean midnight boundaries independently of browser timezone',()=>{const before=Date.parse('2026-11-14T14:59:59Z'),after=Date.parse('2026-11-14T15:00:00Z');expect(koreanDayBounds(before).end).toBe(after-1);expect(koreanDayBounds(after).start).toBe(after)})
 it('normalizes damaged avatar data',()=>{expect(normalizeAvatar({name:'',skin:999,hair:-1,shirt:.5},'방문자')).toEqual({name:'방문자',skin:0,hair:0,shirt:0})})
})
