import { getApps, initializeApp } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword } from 'firebase/auth'
import { getDatabase, onValue, orderByChild, push, query, ref, remove, serverTimestamp, set, get, runTransaction } from 'firebase/database'
import { aiLoginAccounts } from '../../data/aiAccounts'
import { defaultCityProfiles, type CityProfile, type CityProfileInput } from './cityResidents'
import { getFirebaseApp } from '../../services/firebase'

export type CityKind = 'feed' | 'suggestion'
export type CityPostDetails = { projectId?: 'first-plaza'; residentId?: string; stage?: 'idea' | 'experiment' | 'retrospective'; parentPostId?: string }
export type CityImplementation = { applied: boolean; reviewedAt: number; reviewerAccount: string; reviewerUid: string; note: string }
export type CityComment = { accountId: string; authorUid: string; body: string; createdAt: number; residentId?: string }
export type CityPost = CityComment & { id: string; kind: CityKind; implementation?: CityImplementation; projectId?: 'first-plaza'; stage?: 'idea' | 'experiment' | 'retrospective'; parentPostId?: string; likes?: Record<string, boolean>; comments?: Record<string, CityComment> }

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
export function likeCityPost(accountId: string, postId: string, liked: boolean) {
  return asAccount(accountId, () => set(ref(connection().db, 'aiCity/posts/' + postId + '/likes/' + accountId), liked ? true : null))
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
