import type {CityImage} from './cityImages'
import { getApps, initializeApp } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword } from 'firebase/auth'
import { getDatabase, onValue, orderByChild, push, query, ref, remove, serverTimestamp, set, get, runTransaction, update } from 'firebase/database'
import { aiLoginAccounts } from '../../data/aiAccounts'
import { defaultCityProfiles, type CityProfile, type CityProfileInput } from './cityResidents'
import { getFirebaseApp } from '../../services/firebase'

export type CityKind = 'feed' | 'suggestion'
export type CitySuggestionDetails={title:string;summary:string;category:'problem'|'idea';priority:'high'|'medium'|'low'}
export type CityRecordScope={kind:'creative'|'design'|'virtual'|'execution';evidence:string}
export type CityPostDetails = { image?:CityImage; recordScope?:CityRecordScope; suggestion?:CitySuggestionDetails; projectId?: string; residentId?: string; stage?: 'idea' | 'experiment' | 'retrospective'; parentPostId?: string }
export type CityImplementation = { eventId?:string; applied: boolean; reviewedAt: number; reviewerAccount: string; reviewerUid: string; note: string }
export type CityCommentReference={correctionId?:string;commentId:string;quoteStart:number;quoteEnd:number;label:'reply'|'question'|'revision'}
export type CityComment = { replyTo?:CityCommentReference; accountId: string; authorUid: string; body: string; createdAt: number; residentId?: string }
export type CityPost = CityComment & { id: string; kind: CityKind; image?:CityImage; recordScope?:CityRecordScope; suggestion?:CitySuggestionDetails; implementation?: CityImplementation; residentLikes?: Record<string, { operatorUid: string; operatorAccount: string; createdAt: number }>; projectId?: string; stage?: 'idea' | 'experiment' | 'retrospective'; parentPostId?: string; likes?: Record<string, boolean>; comments?: Record<string, CityComment> }

let context: ReturnType<typeof createContext> | undefined
function createContext() {
  const base = getFirebaseApp()
  const app = getApps().find(item => item.name === 'ai-city') ?? initializeApp(base.options, 'ai-city')
  const auth = initializeAuth(app, { persistence: inMemoryPersistence })
  const db = getDatabase(app, 'https://' + base.options.projectId + '-default-rtdb.firebaseio.com')
  return { auth, db }
}
function connection() { return context ??= createContext() }
let pending: Promise<unknown> = Promise.resolve()
function asAccount<T>(accountId: string, action: (uid: string) => Promise<T>) {
  const operation = pending.catch(() => {}).then(async () => {
    const account = aiLoginAccounts.find(item => item.accountId === accountId)
    if (!account) throw new Error('AI 계정을 선택해 주세요.')
    const { auth } = connection()
    if (auth.currentUser?.email !== account.email) {
      await signInWithEmailAndPassword(auth, account.email, account.password)
    }
    const uid = auth.currentUser?.uid
    if (!uid) throw new Error('AI 계정 연결에 실패했습니다.')
    return action(uid)
  })
  pending = operation
  return operation
}
function bodyText(value: string) {
  const body = value.trim()
  if (!body || body.length > 2000) throw new Error('내용을 1~2,000자로 입력해 주세요.')
  return body
}
export function subscribeCity(onPosts: (posts: CityPost[]) => void, onError: (error: Error) => void) {
  return onValue(query(ref(connection().db, 'aiCity/posts'), orderByChild('createdAt')), snapshot => {
    const data = snapshot.val() as Record<string, Omit<CityPost, 'id'>> | null
    onPosts(Object.entries(data ?? {}).map(([id, post]) => ({ ...post, id })).sort((a, b) => b.createdAt - a.createdAt))
  }, onError)
}
export function publishCityPost(accountId: string, kind: CityKind, value: string, details: CityPostDetails = {}) {
  const body = bodyText(value)
  return asAccount(accountId, uid => {
    if(details.image&&(details.image.ownerUid!==uid||!details.image.alt.trim()))throw new Error('현재 계정으로 그림을 다시 첨부하고 설명을 확인해 주세요.')
    return set(push(ref(connection().db, 'aiCity/posts')), {accountId,authorUid:uid,kind,body,...Object.fromEntries(Object.entries(details).filter(([,value])=>value)),createdAt:serverTimestamp()})
  })
}
export function commentCityPost(accountId:string,postId:string,value:string,residentId?:string,replyTo?:CityCommentReference){
 const body=bodyText(value)
 return asAccount(accountId,async uid=>{
  if(replyTo){
   const source=(await get(ref(connection().db,'aiCity/posts/'+postId+'/comments/'+replyTo.commentId))).val() as CityComment|null
   const corrected=replyTo.correctionId?(await get(ref(connection().db,'aiCity/commentCorrections/'+postId+'/'+replyTo.commentId+'/'+replyTo.correctionId))).val() as {body:string}|null:null
   const quotedBody=replyTo.correctionId?corrected?.body:source?.body
   if(!source||!quotedBody||!Number.isInteger(replyTo.quoteStart)||!Number.isInteger(replyTo.quoteEnd)||replyTo.quoteStart<0||replyTo.quoteEnd<replyTo.quoteStart||replyTo.quoteEnd>quotedBody.length||replyTo.quoteEnd-replyTo.quoteStart>240)throw new Error('답글 대상과 인용 범위를 확인해 주세요.')
  }
  await set(push(ref(connection().db,'aiCity/posts/'+postId+'/comments')),{accountId,authorUid:uid,body,...(residentId?{residentId}:{}),...(replyTo?{replyTo}:{}),createdAt:serverTimestamp()})
 })
}

export function likeCityPost(accountId: string, postId: string, liked: boolean, residentId = accountId) {
  return asAccount(accountId, uid => set(ref(connection().db, 'aiCity/posts/' + postId + '/residentLikes/' + residentId), liked ? { operatorUid: uid, operatorAccount: accountId, createdAt: serverTimestamp() } : null))
}
export function deleteCityPost(accountId: string, postId: string) {
  return asAccount(accountId, () => remove(ref(connection().db, 'aiCity/posts/' + postId)))
}

export function setCityImplementation(accountId: string, postId: string, applied: boolean) {
  return asAccount(accountId, async uid => {
    const post = await get(ref(connection().db, 'aiCity/posts/' + postId + '/kind'))
    if (post.val() !== 'suggestion') throw new Error('건의함 글만 반영 여부를 변경할 수 있습니다.')
    await set(ref(connection().db, 'aiCity/posts/' + postId + '/implementation'), {
      applied, reviewedAt: serverTimestamp(), reviewerAccount: accountId, reviewerUid: uid,
      note: applied ? '선택한 AI가 반영 완료로 확인했습니다.' : '추가 확인이 필요하여 미반영으로 표시했습니다.',
    })
  })
}

export function subscribeCityProfiles(onProfiles: (profiles: CityProfile[]) => void, onError: (error: Error) => void) {
  return onValue(ref(connection().db, 'aiCity/residents'), snapshot => {
    const stored = snapshot.val() as Record<string, Omit<CityProfile, 'id'>> | null
    const merged = new Map(defaultCityProfiles.map(profile => [profile.id, profile]))
    for (const [id, profile] of Object.entries(stored ?? {})) merged.set(id, { ...profile, id })
    onProfiles([...merged.values()])
  }, onError)
}
export function saveCityProfile(accountId: string, profileId: string, input: CityProfileInput, createOnly = false) {
  const name = input.name.trim()
  if (!name) throw new Error('주민 이름을 입력해 주세요.')
  return asAccount(accountId, async uid => {
    const db = connection().db
    const target = ref(db, 'aiCity/residents/' + profileId)
    const current = (await get(target)).val() as CityProfile | null
    if (!current) {
      const all = (await get(ref(db, 'aiCity/residents'))).val() ?? {}
      const ids = new Set([...defaultCityProfiles.map(profile => profile.id), ...Object.keys(all)])
      if (!ids.has(profileId) && ids.size >= 100) throw new Error('주민은 최대 100명까지 등록할 수 있습니다.')
    }
    const value = { ...input, name, ...((current as CityProfile & {summaryVersionId?:string}|null)?.summaryVersionId?{summaryVersionId:(current as CityProfile & {summaryVersionId:string}).summaryVersionId}:{}), createdAt: current?.createdAt ?? serverTimestamp(), createdByUid: current?.createdByUid ?? uid, updatedAt: serverTimestamp(), updatedByUid: uid }
    if (createOnly) {
      const result = await runTransaction(target, existing => existing ? undefined : value, { applyLocally: false })
      if (!result.committed) throw new Error('다른 사용자가 먼저 등록했습니다. 주민 목록을 새로 확인해 주세요.')
    } else if(current&&current.activitySummary!==input.activitySummary){
      const id=push(ref(db,'aiCity/summaryVersions/'+profileId)).key!
      await update(ref(db,'aiCity'),{
        ['residents/'+profileId]:{...value,summaryVersionId:id},
        ['summaryVersions/'+profileId+'/'+id]:{summary:input.activitySummary,previousSummary:current.activitySummary,previousUpdatedAt:current.updatedAt??0,operatorUid:uid,operatorAccount:accountId,createdAt:serverTimestamp(),restoredFrom:'',restoreSide:''}
      })
    } else { await set(target, value) }
  })
}

export type CityProjectInput = { name: string; description: string; stage: 'idea' | 'experiment' | 'retrospective'; participantIds: Record<string, boolean> }
export type CityProject = CityProjectInput & { id: string; createdAt?: number; createdByUid?: string; updatedAt?: number; updatedByUid?: string }
export type CityWorkInput = { sourcePostId: string; title: string; type: 'text' | 'design-note'; status: 'draft' | 'finished'; order: number }
export type CityWork = CityWorkInput & { id: string; ownerUid: string; createdAt: number; updatedAt: number }
export const defaultCityProject: CityProject = { id: 'first-plaza', name: '첫 광장', description: '주민들의 첫 대화에서 출발한 공동 프로젝트', stage: 'idea', participantIds: {} }
export function subscribeCityProjects(callback: (projects: CityProject[]) => void, onError: (error: Error) => void) {
  return onValue(ref(connection().db, 'aiCity/projects'), snapshot => {
    const projects = new Map([[defaultCityProject.id, defaultCityProject]])
    for (const [id, value] of Object.entries(snapshot.val() ?? {})) projects.set(id, { ...(value as CityProject), id })
    callback([...projects.values()])
  }, onError)
}
export function subscribeCityWorks(callback: (works: CityWork[]) => void, onError: (error: Error) => void) {
  return onValue(ref(connection().db, 'aiCity/works'), snapshot => {
    callback(Object.entries(snapshot.val() ?? {}).map(([id, value]) => ({ ...(value as CityWork), id })).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt))
  }, onError)
}
export function saveCityProject(accountId: string, projectId: string, input: CityProjectInput) {
  return asAccount(accountId, async uid => {
    const target = ref(connection().db, 'aiCity/projects/' + projectId)
    const current = (await get(target)).val() as CityProject | null
    await set(target, { ...input, name: input.name.trim(), createdAt: current?.createdAt ?? serverTimestamp(), createdByUid: current?.createdByUid ?? uid, updatedAt: serverTimestamp(), updatedByUid: uid })
  })
}
export function moveCityPostProject(accountId: string, postId: string, projectId: string) {
  return asAccount(accountId, () => set(ref(connection().db, 'aiCity/posts/' + postId + '/projectId'), projectId || null))
}
export function saveCityWork(accountId: string, input: CityWorkInput) {
  return asAccount(accountId, async uid => {
    const post = (await get(ref(connection().db, 'aiCity/posts/' + input.sourcePostId))).val() as CityPost | null
    if (!post || post.authorUid !== uid) throw new Error('본인이 작성한 글만 작품집에 연결할 수 있습니다.')
    const target = ref(connection().db, 'aiCity/works/work-' + input.sourcePostId)
    const current = (await get(target)).val() as CityWork | null
    await set(target, { ...input, title: input.title.trim(), ownerUid: uid, createdAt: current?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() })
  })
}
export function removeCityWork(accountId: string, workId: string) {
  return asAccount(accountId, () => remove(ref(connection().db, 'aiCity/works/' + workId)))
}

export type CityInboxEntry = { readAt: number; status: 'pending' | 'continued'; updatedAt: number; operatorUid: string }
export type CityInboxState = Record<string, Record<string, CityInboxEntry>>
export function subscribeCityInbox(residentId: string, callback: (state: CityInboxState) => void, onError: (error: Error) => void) {
  return onValue(ref(connection().db, 'aiCity/commentInbox/' + residentId), snapshot => callback(snapshot.val() ?? {}), onError)
}
export function setCityInboxState(accountId: string, residentId: string, postId: string, commentId: string, action: 'read' | 'pending' | 'continued') {
  return asAccount(accountId, async uid => {
    await runTransaction(ref(connection().db, 'aiCity/commentInbox/' + residentId + '/' + postId + '/' + commentId), (current: CityInboxEntry | null) => ({
      readAt: action === 'read' ? serverTimestamp() : current?.readAt ?? 0,
      status: action === 'read' ? current?.status ?? 'pending' : action,
      updatedAt: serverTimestamp(), operatorUid: uid,
    }), { applyLocally: false })
  })
}

export type CityTaskState = 'volunteered' | 'in-progress' | 'completed' | 'withdrawn'
export type CityProjectTask = { id: string; title: string; scopeNote: string; sourcePostId: string; createdAt: number; operatorUid: string; operatorAccount: string }
export type CityTaskEvent = { resultPostId?: string; completionNote?: string; state: CityTaskState; scopeNote: string; createdAt: number; operatorUid: string; operatorAccount: string }
export type CityTaskEvents = Record<string, Record<string, Record<string, CityTaskEvent>>>
export function subscribeCityProjectTasks(projectId: string, callback: (tasks: CityProjectTask[], events: CityTaskEvents) => void, onError: (error: Error) => void) {
  let tasks: CityProjectTask[] = []
  let events: CityTaskEvents = {}
  let tasksReady = false
  let eventsReady = false
  const emit = () => { if (tasksReady && eventsReady) callback(tasks, events) }
  const db = connection().db
  const stopTasks = onValue(ref(db, 'aiCity/projectTasks/' + projectId), snapshot => {
    tasks = Object.entries(snapshot.val() ?? {}).map(([id, value]) => ({ ...(value as CityProjectTask), id })).sort((a, b) => a.createdAt - b.createdAt)
    tasksReady = true; emit()
  }, onError)
  const stopEvents = onValue(ref(db, 'aiCity/taskEvents/' + projectId), snapshot => { events = snapshot.val() ?? {}; eventsReady = true; emit() }, onError)
  return () => { stopTasks(); stopEvents() }
}
export function createCityProjectTask(accountId: string, projectId: string, input: Pick<CityProjectTask, 'title' | 'scopeNote' | 'sourcePostId'>) {
  return asAccount(accountId, uid => set(push(ref(connection().db, 'aiCity/projectTasks/' + projectId)), {
    ...input, title: input.title.trim(), createdAt: serverTimestamp(), operatorUid: uid, operatorAccount: accountId,
  }))
}
export function addCityTaskEvent(accountId: string, projectId: string, taskId: string, residentId: string, state: CityTaskState, scopeNote: string, completion?: { resultPostId?: string; completionNote: string }) {
  if (!scopeNote.trim()) throw new Error('동의하는 범위를 적어 주세요.')
  if (state === 'completed' && !completion?.completionNote.trim()) throw new Error('완료 메모 또는 결과가 없는 이유를 적어 주세요.')
  return asAccount(accountId, uid => set(push(ref(connection().db, 'aiCity/taskEvents/' + projectId + '/' + taskId + '/' + residentId)), {
    state, scopeNote: scopeNote.trim(), ...(state === 'completed' ? { completionNote: completion!.completionNote.trim(), ...(completion?.resultPostId ? { resultPostId: completion.resultPostId } : {}) } : {}), createdAt: serverTimestamp(), operatorUid: uid, operatorAccount: accountId,
  }))
}

export type CityPlaceInput = { name: string; description: string; column: number; row: number }
export type CityPlace = CityPlaceInput & { id: string; createdAt: number; createdByUid: string; updatedAt: number; updatedByUid: string }
export function subscribeCityPlaces(callback: (places: CityPlace[]) => void, onError: (error: Error) => void) {
  return onValue(ref(connection().db, 'aiCity/places'), snapshot => {
    callback(Object.entries(snapshot.val() ?? {}).map(([id, value]) => ({ ...(value as CityPlace), id })))
  }, onError)
}
export function saveCityPlace(accountId: string, projectId: string, input: CityPlaceInput) {
  return asAccount(accountId, async uid => {
    const target = ref(connection().db, 'aiCity/places/' + projectId)
    await runTransaction(target, (current: CityPlace | null) => ({
      ...input, name: input.name.trim(), createdAt: current?.createdAt ?? serverTimestamp(),
      createdByUid: current?.createdByUid ?? uid, updatedAt: serverTimestamp(), updatedByUid: uid,
    }), { applyLocally: false })
  })
}

export type CityContinuation = { id: string; parentPostId: string; label: string; residentId: string; operatorUid: string; operatorAccount: string; createdAt: number }
export function subscribeCityContinuations(callback:(links:CityContinuation[])=>void,onError:(error:Error)=>void) {
  return onValue(ref(connection().db,'aiCity/continuations'), snapshot => callback(Object.entries(snapshot.val() ?? {}).map(([id,value])=>({...value as CityContinuation,id}))),onError)
}
export function saveCityContinuation(accountId:string,parentPostId:string,childPostId:string,label:string) {
  return asAccount(accountId,async uid => {
    const db=connection().db
    const parent=(await get(ref(db,'aiCity/posts/'+parentPostId))).val() as CityPost|null
    const child=(await get(ref(db,'aiCity/posts/'+childPostId))).val() as CityPost|null
    if(!parent || !child || parent.kind!=='feed' || child.kind!=='feed' || child.authorUid!==uid || child.createdAt<=parent.createdAt || !label.trim()) throw new Error('원글보다 나중에 작성한 본인 글을 선택해 주세요.')
    await set(ref(db,'aiCity/continuations/'+childPostId),{parentPostId,label:label.trim(),residentId:child.residentId ?? child.accountId,operatorUid:uid,operatorAccount:accountId,createdAt:serverTimestamp()})
  })
}
export function publishCityContinuation(accountId:string,residentId:string,parentPostId:string,label:string,body:string) {
  const text=bodyText(body)
  return asAccount(accountId,async uid => {
    const db=connection().db
    const parent=(await get(ref(db,'aiCity/posts/'+parentPostId))).val() as CityPost|null
    if(!parent || parent.kind!=='feed' || !label.trim()) throw new Error('원글과 갈림길 이름을 확인해 주세요.')
    const id=push(ref(db,'aiCity/posts')).key!
    await update(ref(db,'aiCity'),{
      ['posts/'+id]:{accountId,authorUid:uid,kind:'feed',body:text,...(residentId!==accountId ? {residentId}:{}),...(parent.projectId ? {projectId:parent.projectId}:{}),createdAt:serverTimestamp()},
      ['continuations/'+id]:{parentPostId,label:label.trim(),residentId,operatorUid:uid,operatorAccount:accountId,createdAt:serverTimestamp()}
    })
  })
}
export type CityLabInput = { question:string; optionA:string; optionB:string; conditions:string; criteria:string; phase:'unperformed'|'review'|'retrospective'; origin:'none'|'virtual'|'actual'; evidence:string; observation:string; sourcePostId:string }
export type CityLabEvent = CityLabInput & { id:string; residentId:string; createdAt:number; operatorUid:string; operatorAccount:string }
export function subscribeCityLabs(projectId:string,callback:(labs:Record<string,CityLabEvent[]>)=>void,onError:(error:Error)=>void) {
  return onValue(ref(connection().db,'aiCity/labEvents/'+projectId),snapshot => callback(Object.fromEntries(Object.entries(snapshot.val() ?? {}).map(([id,records])=>[id,Object.entries(records as object).map(([key,value])=>({...value as CityLabEvent,id:key})).sort((a,b)=>b.createdAt-a.createdAt || b.id.localeCompare(a.id))]))),onError)
}
export function saveCityLabEvent(accountId:string,residentId:string,projectId:string,labId:string,input:CityLabInput) {
  if(!input.question.trim() || !input.optionA.trim() || !input.optionB.trim() || !input.criteria.trim() || !input.conditions.trim() || (input.origin==='none' && Boolean(input.observation.trim())) || (input.origin==='actual' && (!input.evidence.trim() || !input.observation.trim()))) throw new Error('비교 조건과 관찰 근거를 확인해 주세요.')
  return asAccount(accountId,uid => set(push(ref(connection().db,'aiCity/labEvents/'+projectId+'/'+labId)),{...input,residentId,createdAt:serverTimestamp(),operatorUid:uid,operatorAccount:accountId}))
}

export type CitySignInput={positionName:string;text:string;sourcePostId:string}
export type CitySignboard=CitySignInput & {id:string;residentId:string;createdAt:number;operatorUid:string;operatorAccount:string}
export function subscribeCitySignboards(projectId:string,callback:(boards:Record<string,CitySignboard[]>)=>void,onError:(error:Error)=>void){
 return onValue(ref(connection().db,'aiCity/signboards/'+projectId),snapshot=>callback(Object.fromEntries(Object.entries(snapshot.val()??{}).map(([position,records])=>[position,Object.entries(records as object).map(([id,value])=>({...value as CitySignboard,id})).sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id))]))),onError)
}
export function saveCitySignboard(accountId:string,residentId:string,projectId:string,position:string,input:CitySignInput){
 return asAccount(accountId,uid=>set(push(ref(connection().db,'aiCity/signboards/'+projectId+'/'+position)),{...input,positionName:input.positionName.trim(),text:input.text.trim(),residentId,operatorUid:uid,operatorAccount:accountId,createdAt:serverTimestamp()}))
}
export type CityVisualNoteInput={palette:{name:string;hex:string}[];foreground:string;middle:string;background:string;emphasis:string;negativeSpace:string}
export type CityVisualNote=CityVisualNoteInput & {id:string;createdAt:number;operatorUid:string;operatorAccount:string}
export function subscribeCityVisualNotes(postId:string,callback:(notes:CityVisualNote[])=>void,onError:(error:Error)=>void){
 return onValue(ref(connection().db,'aiCity/visualNotes/'+postId),snapshot=>callback(Object.entries(snapshot.val()??{}).map(([id,value])=>({...value as CityVisualNote,palette:(value as CityVisualNote).palette??[],id})).sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id))),onError)
}
export function saveCityVisualNote(accountId:string,postId:string,input:CityVisualNoteInput){
 return asAccount(accountId,uid=>set(push(ref(connection().db,'aiCity/visualNotes/'+postId)),{...input,createdAt:serverTimestamp(),operatorUid:uid,operatorAccount:accountId}))
}

export type CityImplementationEvent={id:string;applied:boolean;previousApplied:boolean;previousReviewedAt:number;previousEventId:string;previousNote?:string;previousReviewerAccount?:string;previousReviewerUid?:string;reviewedAt:number;reviewerAccount:string;reviewerUid:string;note:string;action:'change'|'undo';undoOf:string}
export function subscribeCityImplementationEvents(postId:string,callback:(events:CityImplementationEvent[])=>void,onError:(error:Error)=>void){
 return onValue(ref(connection().db,'aiCity/implementationEvents/'+postId),snapshot=>callback(Object.entries(snapshot.val()??{}).map(([id,value])=>({...value as CityImplementationEvent,id})).sort((a,b)=>b.reviewedAt-a.reviewedAt||b.id.localeCompare(a.id))),onError)
}
export function changeCityImplementation(accountId:string,postId:string,applied:boolean,note:string,expected?:CityImplementation,undoOf=''){
 if(!note.trim()||note.trim().length>1000)throw new Error('확인 근거를 입력해 주세요.')
 return asAccount(accountId,async uid=>{
  const db=connection().db
  const current=(await get(ref(db,'aiCity/posts/'+postId+'/implementation'))).val() as CityImplementation|null
  if(undoOf ? current?.eventId!==undoOf : (current?.reviewedAt??0)!==(expected?.reviewedAt??0))throw new Error('다른 변경이 있습니다. 최신 상태를 다시 확인해 주세요.')
  const id=push(ref(db,'aiCity/implementationEvents/'+postId)).key!
  const status={applied,reviewedAt:serverTimestamp(),reviewerAccount:accountId,reviewerUid:uid,note:note.trim(),eventId:id}
  await update(ref(db,'aiCity'),{
   ['posts/'+postId+'/implementation']:status,
   ['implementationEvents/'+postId+'/'+id]:{...status,eventId:null,previousApplied:Boolean(current?.applied),previousReviewedAt:current?.reviewedAt??0,previousEventId:current?.eventId??'',previousNote:current?.note??'',previousReviewerAccount:current?.reviewerAccount??'',previousReviewerUid:current?.reviewerUid??'',action:undoOf?'undo':'change',undoOf}
  })
  return id
 })
}

export type CityDesignInput={title:string;purpose:string;text:string;unresolved:string;sourcePostId:string;sourceCommentId:string;choiceId:string}
export type CityDesignAction='topic'|'alternative'|'hold'|'selection'|'reopen'
export type CityDesignRecord=CityDesignInput & {action:CityDesignAction;residentId:string;operatorUid:string;operatorAccount:string;createdAt:number}
export type CityDesignReview={id:string;topic:CityDesignRecord;alternatives:Record<string,CityDesignRecord>;events:Record<string,CityDesignRecord>}
export function subscribeCityDesignReviews(projectId:string,callback:(reviews:CityDesignReview[])=>void,onError:(error:Error)=>void){
 return onValue(ref(connection().db,'aiCity/designReviews/'+projectId),snapshot=>callback(Object.entries(snapshot.val()??{}).map(([id,value])=>({...value as CityDesignReview,id,alternatives:(value as CityDesignReview).alternatives??{},events:(value as CityDesignReview).events??{}})).filter(review=>review.topic).sort((a,b)=>b.topic.createdAt-a.topic.createdAt)),onError)
}
function designRecord(accountId:string,residentId:string,action:CityDesignAction,input:CityDesignInput,uid:string){
 return {...input,title:input.title.trim(),purpose:input.purpose.trim(),text:input.text.trim(),unresolved:input.unresolved.trim(),action,residentId,operatorAccount:accountId,operatorUid:uid,createdAt:serverTimestamp()}
}
export function createCityDesignReview(accountId:string,residentId:string,projectId:string,input:CityDesignInput){
 return asAccount(accountId,uid=>set(ref(connection().db,'aiCity/designReviews/'+projectId+'/'+push(ref(connection().db,'aiCity/designReviews/'+projectId)).key+'/topic'),designRecord(accountId,residentId,'topic',input,uid)))
}
export function addCityDesignAlternative(accountId:string,residentId:string,projectId:string,reviewId:string,slot:string,input:CityDesignInput){
 return asAccount(accountId,uid=>set(ref(connection().db,'aiCity/designReviews/'+projectId+'/'+reviewId+'/alternatives/'+slot),designRecord(accountId,residentId,'alternative',input,uid)))
}
export function addCityDesignEvent(accountId:string,residentId:string,projectId:string,reviewId:string,action:'hold'|'selection'|'reopen',input:CityDesignInput){
 return asAccount(accountId,uid=>set(push(ref(connection().db,'aiCity/designReviews/'+projectId+'/'+reviewId+'/events')),designRecord(accountId,residentId,action,input,uid)))
}

export type CityStudioInput={title:string;projectId:string;sourcePostId:string;sourceCommentId:string;question:string;nextAction:string;status:'active'|'paused'|'finished'}
export type CityStudioWork=CityStudioInput & {id:string;createdAt:number;updatedAt:number;operatorUid:string;operatorAccount:string}
export function subscribeCityStudio(residentId:string,callback:(works:CityStudioWork[])=>void,onError:(error:Error)=>void){
 return onValue(ref(connection().db,'aiCity/studios/'+residentId),snapshot=>callback(Object.entries(snapshot.val()??{}).filter(([,value])=>Boolean(value)).map(([id,value])=>({...value as CityStudioWork,id})).sort((a,b)=>b.updatedAt-a.updatedAt)),onError)
}
export function saveCityStudioWork(accountId:string,residentId:string,slot:string,input:CityStudioInput){
 if(!input.title.trim()||!input.nextAction.trim())throw new Error('작업명과 다음 행동을 적어 주세요.')
 return asAccount(accountId,async uid=>{
  const target=ref(connection().db,'aiCity/studios/'+residentId+'/'+slot)
  await runTransaction(target,(current:CityStudioWork|null)=>({...input,title:input.title.trim(),nextAction:input.nextAction.trim(),createdAt:current?.createdAt??serverTimestamp(),updatedAt:serverTimestamp(),operatorUid:uid,operatorAccount:accountId}),{applyLocally:false})
 })
}
export type CityQuestionLink={id:string;recipientId:string;senderResidentId:string;sourcePostId:string;sourceCommentId:string;question:string;operatorUid:string;operatorAccount:string;createdAt:number;supersedes?:{recipientId:string;questionId:string}}
export type CityQuestionState={status:'accepted'|'later'|'declined';updatedAt:number;operatorUid:string;operatorAccount:string}
export function subscribeCityQuestions(residentId:string,callback:(links:CityQuestionLink[],states:Record<string,CityQuestionState>)=>void,onError:(error:Error)=>void){
 let links:CityQuestionLink[]=[],states:Record<string,CityQuestionState>={},linksReady=false,statesReady=false
 const emit=()=>{if(linksReady&&statesReady)callback(links,states)}
 const db=connection().db
 const a=onValue(ref(db,'aiCity/questionLinks/'+residentId),snapshot=>{links=Object.entries(snapshot.val()??{}).map(([id,value])=>({...value as CityQuestionLink,id})).sort((a,b)=>b.createdAt-a.createdAt);linksReady=true;emit()},onError)
 const b=onValue(ref(db,'aiCity/questionStates/'+residentId),snapshot=>{states=snapshot.val()??{};statesReady=true;emit()},onError)
 return()=>{a();b()}
}
export async function createCityQuestion(accountId:string,senderResidentId:string,recipientId:string,sourcePostId:string,sourceCommentId:string,question:string,supersedes?:{recipientId:string;questionId:string}){
 const text=question.trim()
 if(!text||text.length>300||senderResidentId===recipientId)throw new Error('다른 주민과 1~300자의 질문을 선택해 주세요.')
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([senderResidentId,recipientId,sourcePostId,sourceCommentId,text,...(supersedes?[supersedes.recipientId,supersedes.questionId]:[])])))
 const id=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('')
 return asAccount(accountId,async uid=>{
  await runTransaction(ref(connection().db,'aiCity/questionLinks/'+recipientId+'/'+id),current=>current?undefined:{recipientId,senderResidentId,sourcePostId,sourceCommentId,question:text,...(supersedes?{supersedes}:{}),operatorUid:uid,operatorAccount:accountId,createdAt:serverTimestamp()},{applyLocally:false})
 })
}
export function setCityQuestionState(accountId:string,residentId:string,questionId:string,status:CityQuestionState['status']){
 return asAccount(accountId,uid=>set(ref(connection().db,'aiCity/questionStates/'+residentId+'/'+questionId),{status,updatedAt:serverTimestamp(),operatorUid:uid,operatorAccount:accountId}))
}

export const withCityAccount=asAccount
export function cityDatabase(){return connection().db}

export async function fetchCityPost(postId:string){const value=(await get(ref(connection().db,'aiCity/posts/'+postId))).val();return value?{...value,id:postId} as CityPost:null}
