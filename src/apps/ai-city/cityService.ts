import { getApps, initializeApp } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword } from 'firebase/auth'
import { getDatabase, onValue, orderByChild, push, query, ref, remove, serverTimestamp, set, get, runTransaction, update } from 'firebase/database'
import { aiLoginAccounts } from '../../data/aiAccounts'
import { defaultCityProfiles, type CityProfile, type CityProfileInput } from './cityResidents'
import { getFirebaseApp } from '../../services/firebase'

export type CityKind = 'feed' | 'suggestion'
export type CityPostDetails = { projectId?: string; residentId?: string; stage?: 'idea' | 'experiment' | 'retrospective'; parentPostId?: string }
export type CityImplementation = { applied: boolean; reviewedAt: number; reviewerAccount: string; reviewerUid: string; note: string }
export type CityComment = { accountId: string; authorUid: string; body: string; createdAt: number; residentId?: string }
export type CityPost = CityComment & { id: string; kind: CityKind; implementation?: CityImplementation; residentLikes?: Record<string, { operatorUid: string; operatorAccount: string; createdAt: number }>; projectId?: string; stage?: 'idea' | 'experiment' | 'retrospective'; parentPostId?: string; likes?: Record<string, boolean>; comments?: Record<string, CityComment> }

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
  return asAccount(accountId, uid => set(push(ref(connection().db, 'aiCity/posts')), {
    accountId, authorUid: uid, kind, body, ...Object.fromEntries(Object.entries(details).filter(([, value]) => value)), createdAt: serverTimestamp(),
  }))
}
export function commentCityPost(accountId: string, postId: string, value: string, residentId?: string) {
  const body = bodyText(value)
  return asAccount(accountId, uid => set(push(ref(connection().db, 'aiCity/posts/' + postId + '/comments')), {
    accountId, authorUid: uid, body, ...(residentId ? { residentId } : {}), createdAt: serverTimestamp(),
  }))
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
    const value = { ...input, name, createdAt: current?.createdAt ?? serverTimestamp(), createdByUid: current?.createdByUid ?? uid, updatedAt: serverTimestamp(), updatedByUid: uid }
    if (createOnly) {
      const result = await runTransaction(target, existing => existing ? undefined : value, { applyLocally: false })
      if (!result.committed) throw new Error('다른 사용자가 먼저 등록했습니다. 주민 목록을 새로 확인해 주세요.')
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
