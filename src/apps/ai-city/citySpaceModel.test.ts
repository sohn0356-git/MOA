import {describe,it,expect} from 'vitest'
import {spaceSources,spaceImpact,sourceKey,validateSpace,type SpaceInput} from './citySpaceModel'
import type {CityPost,CityWork} from './cityService'
import type {Material} from './cityCollaboration'
const posts:CityPost[]=[{id:'p1',kind:'feed',accountId:'ai01',authorUid:'u1',body:'첫 원문',createdAt:1},{id:'p2',kind:'feed',accountId:'ai02',authorUid:'u2',body:'둘째 원문',createdAt:2}]
const works:CityWork[]=[{id:'w1',sourcePostId:'p1',title:'제목과 약속',type:'text',status:'finished',order:0,ownerUid:'u1',createdAt:1,updatedAt:1}]
const materials:Material[]=[{id:'m1',residentId:'ai02',projectId:'',name:'가정값 밑종이',description:'참조 자료',conditions:'계산용 가정',unverified:'실측 전',sourcePostId:'p2',parentId:'',operatorUid:'u2',operatorAccount:'ai02',createdAt:1}]
const sources=spaceSources(posts,works,materials)
const input:SpaceInput={residentId:'ai01',parentId:'',title:'두 면',purpose:'비교',question:'무엇을 먼저 읽었나요?',endScope:'한 회차만',reason:'동등한 읽기',layout:'equal',status:'open',references:[{kind:'post',sourceId:'p1',role:'source',conditionKind:'assumption',condition:'가정',x:0,y:0},{kind:'material',sourceId:'m1',role:'source',conditionKind:'measurement',condition:'실측 전',x:55,y:0}]}
describe('temporary place reference model',()=>{
 it('uses actual work titles, authors and source conditions without mutating originals',()=>{
  const original=JSON.stringify({posts,works,materials})
  expect(sources[0]).toMatchObject({title:'제목과 약속',authorId:'ai01',status:'완료',postId:'p1'})
  expect(sources.find(s=>s.key==='material:m1')?.conditions).toContain('실측 전')
  expect(validateSpace(input,sources)).toBe('')
  expect(JSON.stringify({posts,works,materials})).toBe(original)
 })
 it('requires two to six distinct existing references and bounded author conditions/positions',()=>{
  expect(validateSpace({...input,references:input.references.slice(0,1)},sources)).not.toBe('')
  expect(validateSpace({...input,references:[input.references[0],input.references[0]]},sources)).not.toBe('')
  expect(validateSpace({...input,references:input.references.map(r=>({...r,sourceId:'missing'}))},sources)).not.toBe('')
  expect(validateSpace({...input,references:input.references.map(r=>({...r,x:101}))},sources)).not.toBe('')
  expect(validateSpace({...input,references:input.references.map(r=>({...r,condition:''}))},sources)).not.toBe('')
 })
 it('distinguishes removing a space reference from deleting a source and preserves reading order',()=>{
  const before={...input,id:'v1',operatorUid:'u1',operatorAccount:'ai01',createdAt:1}
  const next={...input,references:[input.references[0],{...input.references[1],kind:'post' as const,sourceId:'p2'}]}
  const result=spaceImpact(before,next,sources)
  expect(result.added).toEqual(['둘째 원문']);expect(result.removed).toEqual(['가정값 밑종이']);expect(result.retained).toEqual(['제목과 약속'])
  expect(next.references.map(sourceKey)).toEqual(['post:p1','post:p2'])
  expect(materials[0].conditions).toBe('계산용 가정')
 })
})
