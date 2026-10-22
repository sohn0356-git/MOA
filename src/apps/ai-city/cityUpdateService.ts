import {get,push,update,ref,serverTimestamp} from 'firebase/database'
import {cityDatabase,withCityAccount,type CityTaskEvent} from './cityService'
import {appendCityRecord,type Meta} from './cityCollaboration'
export type UpdateNote=Meta & {residentId:string;changed:string;retained:string;unknown:string;status:'paused'|'unknown'|'confirmed';reason:string;sources:{postId:string;commentId:string}[]}
export type Method=Meta & {residentId:string;title:string;scope:string;prompts:string[]}
export type Legend=Meta & {residentId:string;items:{kind:'reading'|'movement'|'edge'|'unknown';name:string;meaning:string}[]}
export type ConsentScope=Meta & {residentId:string;eventId:string;scope:string;endKind:'date'|'session'|'unknown';endsAt:number;session:string;ended:boolean;reason:string}
export type SummaryVersion={summary:string;previousSummary:string;previousUpdatedAt:number;createdAt:number;operatorUid:string;operatorAccount:string;restoredFrom:string;restoreSide:string}
export function saveUpdate(account:string,projectId:string,input:Omit<UpdateNote,keyof Meta>){return appendCityRecord(account,'projectUpdates/'+projectId,input).then(()=>{})}
export function saveMethod(account:string,projectId:string,input:Omit<Method,keyof Meta>){return appendCityRecord(account,'workMethods/'+projectId,input).then(()=>{})}
export function saveLegend(account:string,postId:string,input:Omit<Legend,keyof Meta>){return appendCityRecord(account,'diagramLegends/'+postId,input).then(()=>{})}
export function saveConsentScope(account:string,projectId:string,taskId:string,input:Omit<ConsentScope,keyof Meta>){return appendCityRecord(account,'consentScopes/'+projectId+'/'+taskId+'/'+input.residentId,input).then(()=>{})}
export function consentValidity(scope:ConsentScope|undefined,event:CityTaskEvent|undefined,eventId:string,now=Date.now()){
 if(!event||event.state==='withdrawn'||event.state==='completed')return 'inactive'
 if(!scope||scope.eventId!==eventId)return 'unconfirmed'
 if(scope.endKind==='unknown')return 'unknown'
 if(scope.endKind==='session')return scope.ended?'expired':'session'
 return scope.endsAt<=now?'expired':'current'
}
export function blankMethodDraft(method:Pick<Method,'title'|'scope'|'prompts'>){return method.title+'\n적용 범위: '+method.scope+'\n\n'+method.prompts.map(prompt=>prompt+'\n[여기에 직접 작성]').join('\n\n')}
export function restoreCitySummary(account:string,residentId:string,versionId:string,expectedUpdatedAt:number,side:'before'|'after'='after'){
 return withCityAccount(account,async uid=>{
 const db=cityDatabase(),current=(await get(ref(db,'aiCity/residents/'+residentId))).val(),version=(await get(ref(db,'aiCity/summaryVersions/'+residentId+'/'+versionId))).val() as SummaryVersion|null
 if(!current||current.updatedAt!==expectedUpdatedAt||!version)throw new Error('프로필이 변경됐습니다. 현재 요약과 복원할 판을 다시 확인해 주세요.')
 const summary=side==='before'?version.previousSummary:version.summary,id=push(ref(db,'aiCity/summaryVersions/'+residentId)).key!
 await update(ref(db,'aiCity'),{
 ['residents/'+residentId]:{...current,activitySummary:summary,summaryVersionId:id,updatedAt:serverTimestamp(),updatedByUid:uid},
 ['summaryVersions/'+residentId+'/'+id]:{summary,previousSummary:current.activitySummary,previousUpdatedAt:current.updatedAt,operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp(),restoredFrom:versionId,restoreSide:side}
 })
 })
}
