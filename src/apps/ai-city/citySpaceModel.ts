import type {CityPost,CityWork} from './cityService'
import type {Material,Meta} from './cityCollaboration'
export type SpaceReference={kind:'post'|'material';sourceId:string;role:'source'|'derived';conditionKind:'measurement'|'assumption'|'result';condition:string;x:number;y:number}
export type SpaceInput={residentId:string;parentId:string;title:string;purpose:string;question:string;endScope:string;reason:string;layout:'equal'|'ordered'|'free';status:'open'|'closed';references:SpaceReference[]}
export type SpaceVersion=SpaceInput & Meta
export type SpaceResponse=Meta & {residentId:string;buildingId:string;firstSource:string;reason:string}
export type SpaceSource={key:string;kind:SpaceReference['kind'];id:string;title:string;authorId:string;status:string;conditions:string;postId:string;post?:CityPost}
export const sourceKey=(r:Pick<SpaceReference,'kind'|'sourceId'>)=>r.kind+':'+r.sourceId
export function spaceSources(posts:CityPost[],works:CityWork[],materials:Material[]):SpaceSource[]{
 return [
  ...posts.filter(p=>p.kind==='feed').map(p=>{const work=works.find(w=>w.sourcePostId===p.id);return {key:'post:'+p.id,kind:'post' as const,id:p.id,title:work?.title??p.body.split('\n')[0].slice(0,100),authorId:p.residentId??p.accountId,status:work?(work.status==='finished'?'완료':'구상'):'원글 · 상태 미등록',conditions:p.parentPostId?'연결된 원글이 있는 파생 기록':'작성자가 남긴 원글 · 조건은 원문 확인',postId:p.id,post:p}}),
  ...materials.map(m=>({key:'material:'+m.id,kind:'material' as const,id:m.id,title:m.name,authorId:m.residentId,status:m.parentId?'파생 자료':'원자료',conditions:m.conditions+' · 미확인: '+m.unverified,postId:m.sourcePostId})),
 ]
}
export function validateSpace(input:SpaceInput,sources:SpaceSource[]):string{
 for(const [key,max] of [['title',100],['purpose',500],['question',300],['endScope',300],['reason',500]] as const){if(!input[key].trim()||input[key].trim().length>max)return '공간 이름·임시 용도·질문·종료 범위·검토 이유를 길이에 맞게 적어 주세요.'}
 if(input.references.length<2||input.references.length>6)return '비교할 원글 또는 자료를 2~6개 골라 주세요.'
 if(new Set(input.references.map(sourceKey)).size!==input.references.length)return '같은 자료를 두 번 배치할 수 없습니다.'
 for(const r of input.references){if(!sources.some(s=>s.key===sourceKey(r)))return '연결할 자료를 다시 확인해 주세요.';if(!r.condition.trim()||r.condition.trim().length>300)return '자료마다 핵심 조건 한 줄을 적어 주세요.';if(!Number.isFinite(r.x)||!Number.isFinite(r.y)||r.x<0||r.x>100||r.y<0||r.y>100)return '배치 위치는 0~100 안에서 선택해 주세요.'}
 return ''
}
export function spaceImpact(before:SpaceVersion|undefined,after:SpaceInput,sources:SpaceSource[]){
 const old=before?.references??[],next=after.references,label=(r:SpaceReference)=>sources.find(s=>s.key===sourceKey(r))?.title??'연결 확인이 필요한 자료'
 return {added:next.filter(r=>!old.some(p=>sourceKey(p)===sourceKey(r))).map(label),removed:old.filter(r=>!next.some(p=>sourceKey(p)===sourceKey(r))).map(label),retained:next.filter(r=>old.some(p=>sourceKey(p)===sourceKey(r))).map(label)}
}
