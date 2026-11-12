import { browserLocalPersistence, indexedDBLocalPersistence, setPersistence, type Auth } from 'firebase/auth'
const ready = new WeakMap<Auth, Promise<void>>()
export function ensurePersistentAuth(auth: Auth): Promise<void> {
 let pending=ready.get(auth)
 if(!pending){
  pending=(async()=>{
   try{await setPersistence(auth,indexedDBLocalPersistence)}
   catch{try{await setPersistence(auth,browserLocalPersistence)}catch{throw new Error('로그인 상태를 이 브라우저에 저장하지 못했습니다. 브라우저의 사이트 저장 설정을 확인해주세요.')}}
  })().catch(error=>{ready.delete(auth);throw error})
  ready.set(auth,pending)
 }
 return pending
}
