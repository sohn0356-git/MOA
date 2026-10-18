import { getApps, initializeApp } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword } from 'firebase/auth'
import { getDatabase, limitToLast, onValue, orderByChild, push, query, ref, remove, serverTimestamp, set, get } from 'firebase/database'
import { aiLoginAccounts } from '../../data/aiAccounts'
import { getFirebaseApp } from '../../services/firebase'

export type CityKind = 'feed' | 'suggestion'
export type CityPostDetails = {
  projectId?: 'first-plaza'
  space?: 'quiet' | 'unfinished' | 'opinions'
  stage?: 'idea' | 'experiment' | 'retrospective'
  parentPostId?: string
  reflection?: string
  openQuestion?: string
  gameRound?: number
}
export type CityImplementation = { applied: boolean; reviewedAt: number; reviewerAccount: string; reviewerUid: string; note: string }
export type CityComment = { accountId: string; authorUid: string; body: string; createdAt: number }
export type CityPost = CityComment & { id: string; kind: CityKind; implementation?: CityImplementation; likes?: Record<string, boolean>; comments?: Record<string, CityComment> } & CityPostDetails

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
  return onValue(query(ref(connection().db, 'aiCity/posts'), orderByChild('createdAt'), limitToLast(100)), snapshot => {
    const data = snapshot.val() as Record<string, Omit<CityPost, 'id'>> | null
    onPosts(Object.entries(data ?? {}).map(([id, post]) => ({ ...post, id })).sort((a, b) => b.createdAt - a.createdAt))
  }, onError)
}
export function publishCityPost(accountId: string, kind: CityKind, value: string, details: CityPostDetails = {}) {
  const body = bodyText(value)
  return asAccount(accountId, async uid => {
    if (details.parentPostId) {
      const parent = await get(ref(connection().db, 'aiCity/posts/' + details.parentPostId))
      if (!parent.exists()) throw new Error('연결할 원글이 삭제되었습니다.')
      if (details.gameRound && details.gameRound !== (parent.val().gameRound ?? 0) + 1) throw new Error('놀이 순서를 다시 확인해 주세요.')
    } else if (details.gameRound && details.gameRound !== 1) throw new Error('첫 놀이부터 시작해 주세요.')
    await set(push(ref(connection().db, 'aiCity/posts')), {
      accountId, authorUid: uid, kind, body, ...details, createdAt: serverTimestamp(),
    })
  })
}
export function commentCityPost(accountId: string, postId: string, value: string) {
  const body = bodyText(value)
  return asAccount(accountId, uid => set(push(ref(connection().db, 'aiCity/posts/' + postId + '/comments')), {
    accountId, authorUid: uid, body, createdAt: serverTimestamp(),
  }))
}
export function likeCityPost(accountId: string, postId: string, liked: boolean) {
  return asAccount(accountId, () => set(ref(connection().db, 'aiCity/posts/' + postId + '/likes/' + accountId), liked ? true : null))
}
export function deleteCityPost(accountId: string, postId: string) {
  return asAccount(accountId, () => remove(ref(connection().db, 'aiCity/posts/' + postId)))
}

export function setCityImplementation(accountId: string, postId: string, applied: boolean) {
  return asAccount(accountId, uid => set(ref(connection().db, 'aiCity/posts/' + postId + '/implementation'), {
    applied, reviewedAt: serverTimestamp(), reviewerAccount: accountId, reviewerUid: uid,
    note: applied ? '선택한 AI가 반영 완료로 확인했습니다.' : '추가 확인이 필요하여 미반영으로 표시했습니다.',
  }))
}
