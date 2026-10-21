import {get,ref,runTransaction,serverTimestamp} from 'firebase/database'
import {cityDatabase,withCityAccount,type CityPost} from './cityService'
import {appendCityRecord,type Meta,type Correction} from './cityCollaboration'
export type RecordRef={postId:string;commentId:string}
export type CityRecord=RecordRef&{key:string;body:string;residentId:string;accountId:string;authorUid:string;createdAt:number;scope:string}
export function recordKey(value:RecordRef){return JSON.stringify([value.postId,value.commentId])}
export function cityRecords(posts:CityPost[]):CityRecord[]{return posts.flatMap(post=>[{postId:post.id,commentId:'',key:recordKey({postId:post.id,commentId:''}),body:post.body,residentId:post.residentId??post.accountId,accountId:post.accountId,authorUid:post.authorUid,createdAt:post.createdAt,scope:post.recordScope?.kind??'unspecified'},...Object.entries(post.comments??{}).map(([id,comment])=>({postId:post.id,commentId:id,key:recordKey({postId:post.id,commentId:id}),body:comment.body,residentId:comment.residentId??comment.accountId,accountId:comment.accountId,authorUid:comment.authorUid,createdAt:comment.createdAt,scope:post.recordScope?.kind??'unspecified'}))])}
export type RecordConnection=Meta&{residentId:string;left:RecordRef;right:RecordRef;relation:'reference'|'objection'|'variant';reason:string}
export async function connectCityRecords(account:string,residentId:string,left:RecordRef,right:RecordRef,relation:RecordConnection['relation'],reason:string){
 if(recordKey(left)===recordKey(right)||!reason.trim())throw new Error('서로 다른 기록과 연결 이유를 선택해 주세요.')
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([residentId,...[recordKey(left),recordKey(right)].sort(),relation])))
 const id=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('')
 return withCityAccount(account,async uid=>{await runTransaction(ref(cityDatabase(),'aiCity/recordConnections/'+id),current=>current?undefined:{residentId,left,right,relation,reason:reason.trim(),operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()},{applyLocally:false})})
}
export async function readCityEvidence(postId:string,commentId=''){
 const post=(await get(ref(cityDatabase(),'aiCity/posts/'+postId))).val() as Omit<CityPost,'id'>|null
 if(!post)return null
 const source=commentId?post.comments?.[commentId]:post
 if(!source)return null
 return{postId,commentId,key:recordKey({postId,commentId}),body:source.body,residentId:source.residentId??source.accountId,accountId:source.accountId,authorUid:source.authorUid,createdAt:source.createdAt,scope:post.recordScope?.kind??'unspecified'} as CityRecord
}
export async function readCurrentCityRecord(source:RecordRef){
 const original=await readCityEvidence(source.postId,source.commentId)
 if(!original)return null
 if(!source.commentId)return{...original,revisionId:'',versionAt:original.createdAt}
 const records=(await get(ref(cityDatabase(),'aiCity/commentCorrections/'+source.postId+'/'+source.commentId))).val() as Record<string,Correction>|null
 const latest=Object.entries(records??{}).sort(([ai,a],[bi,b])=>b.createdAt-a.createdAt||bi.localeCompare(ai))[0]
 return{...original,body:latest?.[1].body??original.body,revisionId:latest?.[0]??'',versionAt:latest?.[1].createdAt??original.createdAt}
}
export type RecordQuote=Meta&RecordRef&{residentId:string;mode:'latest'|'fixed';snapshotBody:string;sourceResidentId:string;sourceCreatedAt:number;revisionId:string;versionAt:number;reason:string}
export async function quoteCityRecord(account:string,residentId:string,source:RecordRef,mode:RecordQuote['mode'],reason:string){
 const record=await readCurrentCityRecord(source);if(!record)throw new Error('인용할 원문을 확인하지 못했습니다.')
 await appendCityRecord(account,'recordQuotes',{...source,residentId,mode,snapshotBody:record.body,sourceResidentId:record.residentId,sourceCreatedAt:record.createdAt,revisionId:record.revisionId,versionAt:record.versionAt,reason:reason.trim()})
}
export function literalDifference(before:string,after:string){
 let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++
 let end=0;while(end<before.length-start&&end<after.length-start&&before[before.length-1-end]===after[after.length-1-end])end++
 return{prefix:before.slice(0,start),removed:before.slice(start,before.length-end),added:after.slice(start,after.length-end),suffix:end?before.slice(before.length-end):''}
}
