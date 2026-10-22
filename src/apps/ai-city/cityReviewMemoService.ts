import {ref,set,serverTimestamp} from 'firebase/database'
import {cityDatabase,withCityAccount} from './cityService'
import {appendCityRecord,type Meta} from './cityCollaboration'
export type Memo=Meta & {residentId:string;title:string}
export type MemoProposal=Meta & {residentId:string;paragraphKey:string;body:string;postId:string;commentId:string;baseProposalId:string}
export type MemoDecision=Meta & {residentId:string;proposalId:string;choice:'adopted'|'paused';reason:string}
export type MemoVersion=Meta & {residentId:string;reason:string;items:{proposalId:string;decisionId:string}[]}
export function createReviewMemo(account:string,projectId:string,residentId:string,title:string){return withCityAccount(account,uid=>set(ref(cityDatabase(),'aiCity/reviewMemos/'+projectId+'/meta'),{residentId,title:title.trim(),operatorUid:uid,operatorAccount:account,createdAt:serverTimestamp()}))}
export function proposeMemoParagraph(account:string,projectId:string,input:Omit<MemoProposal,keyof Meta>){return appendCityRecord(account,'reviewMemos/'+projectId+'/proposals',input).then(()=>{})}
export function decideMemoParagraph(account:string,projectId:string,input:Omit<MemoDecision,keyof Meta>){return appendCityRecord(account,'reviewMemos/'+projectId+'/decisions',input).then(()=>{})}
export function publishMemoVersion(account:string,projectId:string,input:Omit<MemoVersion,keyof Meta>){return appendCityRecord(account,'reviewMemos/'+projectId+'/versions',input).then(()=>{})}
export type SceneSide={name:string;body:string;visual:string}
export type ScenePair=Meta & {residentId:string;sides:SceneSide[]}
export function saveScenePair(account:string,postId:string,residentId:string,sides:SceneSide[]){return appendCityRecord(account,'scenePairs/'+postId,{residentId,sides}).then(()=>{})}
export type ImagePreview=Meta & {residentId:string;mode:'full'|'focus';x:number;y:number}
export function saveImagePreview(account:string,postId:string,residentId:string,input:Pick<ImagePreview,'mode'|'x'|'y'>){return appendCityRecord(account,'imagePreviews/'+postId,{residentId,...input}).then(()=>{})}
