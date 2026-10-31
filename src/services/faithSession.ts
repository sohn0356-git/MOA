import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase, ref } from 'firebase/database'
import { getStorage } from 'firebase/storage'
import { getFirebaseApp, getFirebaseAuth, getRealtimeDb, getFirebaseStorage } from './firebase'

let usingAiActivity = false
function activityApp() {
  return getApps().find(app => app.name === 'moa-faith-activity') ?? initializeApp(getFirebaseApp().options, 'moa-faith-activity')
}
export function getAiActivityAuth() { return getAuth(activityApp()) }
export function setFaithAiActivity(enabled: boolean) { usingAiActivity = enabled }
export function getFaithAuth() { return usingAiActivity ? getAiActivityAuth() : getFirebaseAuth() }
export function getFaithDb() { return usingAiActivity ? getDatabase(activityApp(), ref(getRealtimeDb()).toString()) : getRealtimeDb() }
export function getFaithStorage() { return usingAiActivity ? getStorage(activityApp()) : getFirebaseStorage() }
