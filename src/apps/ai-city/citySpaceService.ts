import {get,onValue,push,ref,serverTimestamp,update} from 'firebase/database'
import {appendCityRecord} from './cityCollaboration'
import {cityDatabase,withCityAccount} from './cityService'
import {cityBuildings,type CityBuildingId} from './cityBuildings'
import {validateSpace,type SpaceInput,type SpaceSource,type SpaceVersion} from './citySpaceModel'
export type SpaceSnapshot={currentId:string;versions:SpaceVersion[]}
export function watchSpace(buildingId:CityBuildingId,callback:(value:SpaceSnapshot)=>void,onError:(error:Error)=>void){
 return onValue(ref(cityDatabase(),'aiCity/spaceUses/'+buildingId),snapshot=>{const value=snapshot.val();callback({currentId:typeof value?.currentId==='string'?value.currentId:'',versions:Object.entries(value?.versions??{}).map(([id,item])=>({...item as SpaceVersion,id})).sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id))})},onError)
}
export async function publishSpace(account:string,buildingId:CityBuildingId,input:SpaceInput,sources:SpaceSource[]){
 const error=validateSpace(input,sources);if(error)throw new Error(error)
 if(!cityBuildings.some(b=>b.id===buildingId))throw new Error('기존 도시 장소를 선택해 주세요.')
 return withCityAccount(account,async uid=>{
  const place=ref(cityDatabase(),'aiCity/spaceUses/'+buildingId),value=(await get(place)).val(),current=value?.versions?.[value.currentId] as SpaceVersion|undefined
  if((value?.currentId??'')!==input.parentId)throw new Error('공개판이 바뀌었습니다. 최신 판과 영향을 다시 확인해 주세요.')
  if(input.status==='closed'&&(!current||current.residentId!==input.residentId||current.operatorAccount!==account))throw new Error('현재 공간을 연 주민만 종료 기록을 남길 수 있습니다.')
  const id=push(ref(cityDatabase(),'aiCity/spaceUses/'+buildingId+'/versions')).key!
  const payload={...input,title:input.title.trim(),purpose:input.purpose.trim(),question:input.question.trim(),endScope:input.endScope.trim(),reason:input.reason.trim(),references:input.references.map(r=>({...r,condition:r.condition.trim()})),operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()}
  // Rules compare parentId with the prior currentId. A concurrent publication cannot silently replace this draft.
  await update(place,{currentId:id,['versions/'+id]:payload})
 })
}
export async function respondToSpace(account:string,buildingId:CityBuildingId,versionId:string,residentId:string,firstSource:string,reason:string){
 if(!reason.trim()||reason.trim().length>300)throw new Error('먼저 읽은 이유를 1~300자로 적어 주세요.')
 await appendCityRecord(account,'spaceResponses/'+versionId,{buildingId,residentId,firstSource,reason:reason.trim()})
}
