import {get,onValue,push,ref,set,serverTimestamp,runTransaction} from 'firebase/database'
import {cityDatabase,withCityAccount,type CityPost,type CityStudioWork,type CityQuestionLink,type CityQuestionState} from './cityService'
export type Meta={id:string;operatorUid:string;operatorAccount:string;createdAt:number}
export type Material=Meta & {residentId:string;projectId:string;name:string;description:string;conditions:string;unverified:string;sourcePostId:string;parentId:string}
export type Scene={postId:string;connection:string}
export type Edition=Meta & {residentId:string;title:string;scenes:Scene[];contributors:Record<string,boolean>}
export type Consent=Meta & {residentId:string;accepted:boolean}
export type Stage=Meta & {residentId:string;stage:'draft'|'question'|'objection'|'revision'|'paused'}
export type Correction=Meta & {residentId:string;body:string;reason:string;kind:'typo'|'meaning'}
export type Withdrawal=Meta & {residentId:string;reason:string}
export function watchCityRecords<T extends Meta>(path:string,callback:(value:T[])=>void,onError:(error:Error)=>void){
 return onValue(ref(cityDatabase(),'aiCity/'+path),snapshot=>callback(Object.entries(snapshot.val()??{}).map(([id,value])=>({...value as T,id})).sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id))),onError)
}
export function watchCityValue<T=Record<string,unknown>>(path:string,callback:(value:T)=>void,onError:(error:Error)=>void){return onValue(ref(cityDatabase(),'aiCity/'+path),snapshot=>callback(snapshot.val()??{}),onError)}
export function appendCityRecord(account:string,path:string,value:object){
 return withCityAccount(account,async uid=>{const target=push(ref(cityDatabase(),'aiCity/'+path));await set(target,{...value,operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()});return target.key!})
}
export function saveMaterial(account:string,input:Omit<Material,keyof Meta>){return appendCityRecord(account,'materials',input).then(()=>{})}
export function addPostStage(account:string,postId:string,residentId:string,stage:Stage['stage']){return appendCityRecord(account,'postStages/'+postId,{residentId,stage}).then(()=>{})}
export function correctComment(account:string,postId:string,commentId:string,residentId:string,body:string,reason:string,kind:Correction['kind']){
 if(!body.trim()||!reason.trim())throw new Error('정정 문장과 이유를 적어 주세요.')
 return appendCityRecord(account,'commentCorrections/'+postId+'/'+commentId,{residentId,body:body.trim(),reason:reason.trim(),kind}).then(()=>{})
}
export function withdrawQuestion(account:string,senderId:string,recipientId:string,questionId:string,reason:string){
 return withCityAccount(account,uid=>set(ref(cityDatabase(),'aiCity/questionWithdrawals/'+recipientId+'/'+questionId),{residentId:senderId,reason:reason.trim(),operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()}))
}
export function subscribeSentQuestions(senderId:string,callback:(links:CityQuestionLink[],withdrawals:Record<string,Record<string,Withdrawal>>,states:Record<string,Record<string,CityQuestionState>>)=>void,onError:(error:Error)=>void){
 let links:CityQuestionLink[]=[],withdrawals={},states={};const ready=new Set<string>();const emit=()=>{if(ready.size===3)callback(links,withdrawals,states)}
 const stops=[watchCityValue<Record<string,Record<string,CityQuestionLink>>>('questionLinks',value=>{links=Object.entries(value).flatMap(([recipient,records])=>Object.entries(records).map(([id,record])=>({...record,id,recipientId:recipient}))).filter(link=>link.senderResidentId===senderId).sort((a,b)=>b.createdAt-a.createdAt);ready.add('links');emit()},onError),watchCityValue('questionWithdrawals',value=>{withdrawals=value;ready.add('withdrawals');emit()},onError),watchCityValue('questionStates',value=>{states=value;ready.add('states');emit()},onError)]
 return()=>stops.forEach(stop=>stop())
}
export async function createEdition(account:string,residentId:string,title:string,scenes:Scene[],posts:CityPost[]){
 if(!title.trim()||scenes.length<3||scenes.length>10||new Set(scenes.map(scene=>scene.postId)).size!==scenes.length)throw new Error('서로 다른 원글 3~10개와 제목을 정해 주세요.')
 const contributors=Object.fromEntries(scenes.map(scene=>{const post=posts.find(post=>post.id===scene.postId);if(!post||post.kind!=='feed')throw new Error('원글을 확인해 주세요.');return[post.authorUid,true]}))
 return appendCityRecord(account,'editionPlans/'+residentId,{residentId,title:title.trim(),scenes,contributors})
}
export function requestEditionConsent(account:string,editorId:string,edition:Edition,posts:CityPost[]){
 return withCityAccount(account,async uid=>{for(const scene of edition.scenes){const post=posts.find(post=>post.id===scene.postId);if(!post||(post.residentId??post.accountId)===editorId)continue
 const recipient=post.residentId??post.accountId
 await runTransaction(ref(cityDatabase(),'aiCity/editionRequests/'+recipient+'/'+edition.id+'/'+scene.postId),current=>current?undefined:({editorId,editionId:edition.id,sourcePostId:scene.postId,operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()}),{applyLocally:false})
 }})
}
export function approveEdition(account:string,residentId:string,editorId:string,editionId:string,postId:string,accepted:boolean){
 return withCityAccount(account,uid=>set(ref(cityDatabase(),'aiCity/editionConsents/'+editorId+'/'+editionId+'/'+postId),{residentId,accepted,operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()}))
}
export function publishEdition(account:string,edition:Edition){
 return withCityAccount(account,async()=>{const plan=(await get(ref(cityDatabase(),'aiCity/editionPlans/'+edition.residentId+'/'+edition.id))).val();if(!plan)throw new Error('편집 초안을 확인해 주세요.');await set(ref(cityDatabase(),'aiCity/editions/'+edition.id),plan)})
}
export function watchProgress(callback:(works:Record<string,Record<string,CityStudioWork>>,questions:Record<string,Record<string,CityQuestionLink>>,states:Record<string,Record<string,CityQuestionState>>,withdrawals:Record<string,Record<string,Withdrawal>>)=>void,onError:(error:Error)=>void){
 let works={},questions={},states={},withdrawals={};const ready=new Set<string>();const emit=()=>{if(ready.size===4)callback(works,questions,states,withdrawals)}
 const stops=[watchCityValue('studios',v=>{works=v;ready.add('w');emit()},onError),watchCityValue('questionLinks',v=>{questions=v;ready.add('q');emit()},onError),watchCityValue('questionStates',v=>{states=v;ready.add('s');emit()},onError),watchCityValue('questionWithdrawals',v=>{withdrawals=v;ready.add('x');emit()},onError)]
 return()=>stops.forEach(stop=>stop())
}

export function watchEditorPlans(account:string,residentId:string,callback:(plans:Edition[])=>void,onError:(error:Error)=>void){
 let stopped=false,stop=()=>{}
 void withCityAccount(account,async()=>{if(!stopped)stop=watchCityRecords<Edition>('editionPlans/'+residentId,callback,onError)}).catch(onError)
 return()=>{stopped=true;stop()}
}
export function readEdition(account:string,editorId:string,editionId:string){
 return withCityAccount(account,async()=>{const value=(await get(ref(cityDatabase(),'aiCity/editionPlans/'+editorId+'/'+editionId))).val();return value?{...value,id:editionId} as Edition:null})
}
