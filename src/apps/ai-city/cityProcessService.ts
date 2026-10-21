import {get,ref,set,push,update,runTransaction,serverTimestamp} from 'firebase/database'
import {cityDatabase,withCityAccount,moveCityPostProject,type CityStudioInput} from './cityService'
import {appendCityRecord,type Meta} from './cityCollaboration'
export type Point={id:string;title:string;condition:string;unknown:string;reason:string;status:'preparing'|'review'|'passed'|'paused';postId:string;commentId:string;labId:string}
export type StageMap=Meta & {residentId:string;points:Point[]}
export type DependencyInput={nodes:{id:string;title:string;postId:string}[];edges:{before:string;after:string;condition:string;reason:string;postId:string;evidencePostId:string}[]}
export type DependencyBoard=Meta & DependencyInput & {residentId:string}
export type ReviewQuestion=Meta & {residentId:string;question:string;sourcePostId:string}
export type ReviewAnswer=Meta & {residentId:string;choice:'understood'|'question'|'paused';reason:string}
export type Workshop=Meta & {residentId:string;title:string;question:string}
export type WorkshopEvent=Meta & {residentId:string;kind:'draft'|'review'|'followup';postId:string;targetResidentId:string;reason:string;decision:'none'|'adopted'|'paused';nextAction:string}
export function saveStageMap(account:string,projectId:string,residentId:string,points:Point[]){return appendCityRecord(account,'stageMaps/'+projectId,{residentId,points}).then(()=>{})}
export function saveDependencies(account:string,projectId:string,residentId:string,input:DependencyInput){return appendCityRecord(account,'dependencyBoards/'+projectId,{residentId,...input}).then(()=>{})}
export function dependencyCycle(input:DependencyInput){
 const links=new Map(input.nodes.map(node=>[node.id,input.edges.filter(edge=>edge.before===node.id).map(edge=>edge.after)])),active=new Set<string>(),done=new Set<string>()
 function visit(id:string):boolean{if(active.has(id))return true;if(done.has(id))return false;active.add(id);if((links.get(id)??[]).some(visit))return true;active.delete(id);done.add(id);return false}
 return input.nodes.some(node=>visit(node.id))
}
export function createReviewQuestion(account:string,projectId:string,reviewId:string,residentId:string,question:string,sourcePostId:string){
 return withCityAccount(account,uid=>set(ref(cityDatabase(),'aiCity/reviewQuestions/'+projectId+'/'+reviewId),{residentId,question:question.trim(),sourcePostId,operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()}))
}
export function answerReview(account:string,projectId:string,reviewId:string,residentId:string,choice:ReviewAnswer['choice'],reason:string){return appendCityRecord(account,'reviewAnswers/'+projectId+'/'+reviewId+'/'+residentId,{residentId,choice,reason:reason.trim()}).then(()=>{})}
export function createWorkshop(account:string,projectId:string,residentId:string,title:string,question:string){return appendCityRecord(account,'workshops/'+projectId,{residentId,title:title.trim(),question:question.trim()}).then(()=>{})}
export function joinWorkshop(account:string,projectId:string,sessionId:string,residentId:string){
 return withCityAccount(account,async uid=>{await runTransaction(ref(cityDatabase(),'aiCity/workshopMembers/'+projectId+'/'+sessionId+'/'+residentId),current=>current?undefined:{residentId,operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()},{applyLocally:false})})
}
export function addWorkshopEvent(account:string,projectId:string,sessionId:string,input:Omit<WorkshopEvent,keyof Meta>){return appendCityRecord(account,'workshopEvents/'+projectId+'/'+sessionId,input).then(()=>{})}
export type TriageStage='received'|'needs-info'|'candidate'|'paused'
export type TriageRecord=Meta & {residentId:string;stage:TriageStage;reason:string;minimal:string;screen:string;relatedPostId:string;slot:string}
export function saveTriage(account:string,residentId:string,postId:string,input:Omit<TriageRecord,keyof Meta|'residentId'>){
 return withCityAccount(account,async uid=>{
  const db=cityDatabase(),id=push(ref(db,'aiCity/triageEvents/'+postId)).key!
  const candidates=(await get(ref(db,'aiCity/triageCandidates'))).val()??{}
  const updates:Record<string,unknown>={}
  for(const [slot,value] of Object.entries(candidates)){if(value&&(value as {postId:string}).postId===postId)updates['triageCandidates/'+slot]=null}
  if(input.stage==='candidate'){
   if(!['1','2','3'].includes(input.slot))throw new Error('실행 후보 자리 1~3을 선택해 주세요.')
   if(candidates[input.slot]&&candidates[input.slot].postId!==postId)throw new Error('다른 후보가 차지한 자리입니다. 다른 자리를 고르거나 기존 후보를 검토해 주세요.')
   updates['triageCandidates/'+input.slot]={postId,eventId:id}
  }
  const value={...input,slot:input.stage==='candidate'?input.slot:'',residentId,operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()}
  updates['triageEvents/'+postId+'/'+id]=value;updates['triageCurrent/'+postId]={...value,eventId:id}
  await update(ref(db,'aiCity'),updates)
 })
}
export type BatchResult={id:string;status:'done'|'failed';error?:string}
export async function runCityBatch(steps:{id:string;run:()=>Promise<void>}[],previous:BatchResult[]=[]){
 const results=[...previous]
 for(const step of steps){if(results.find(result=>result.id===step.id)?.status==='done')continue;try{await step.run();const index=results.findIndex(result=>result.id===step.id);const result:BatchResult={id:step.id,status:'done'};if(index<0)results.push(result);else results[index]=result}catch(error){const index=results.findIndex(result=>result.id===step.id);const result:BatchResult={id:step.id,status:'failed',error:error instanceof Error?error.message:'저장 실패'};if(index<0)results.push(result);else results[index]=result}}
 return results
}
export function batchSteps(account:string,residentId:string,postId:string,projectId:string,slot:string,input:CityStudioInput,expectedUpdatedAt=0){
 return[{id:'project',run:()=>moveCityPostProject(account,postId,projectId)},{id:'studio',run:()=>withCityAccount(account,async uid=>{
  const result=await runTransaction(ref(cityDatabase(),'aiCity/studios/'+residentId+'/'+slot),(current:Record<string,unknown>|null)=>{
   if((current?.updatedAt??0)!==expectedUpdatedAt)return
   return{...(current??input),nextAction:input.nextAction,createdAt:current?.createdAt??serverTimestamp(),updatedAt:serverTimestamp(),operatorUid:uid,operatorAccount:account}
  },{applyLocally:false})
  if(!result.committed)throw new Error('작업실 값이 변경됐습니다. 변경 목록을 다시 확인해 주세요.')
 })}]
}

export function linkWorkshopDraft(account:string,projectId:string,sessionId:string,residentId:string,postId:string){
 return withCityAccount(account,uid=>set(ref(cityDatabase(),'aiCity/workshopDrafts/'+projectId+'/'+sessionId+'/'+residentId),{residentId,postId,operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()}))
}
