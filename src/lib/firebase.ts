import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const requiredConfigEntries = [
  ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
  ['VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId],
  ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
] as const

export function getMissingFirebaseConfigKeys() {
  return requiredConfigEntries
    .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
    .map(([key]) => key)
}

export function isFirebaseConfigured() {
  return getMissingFirebaseConfigKeys().length === 0
}

export function getFirebaseConfigError() {
  const missingKeys = getMissingFirebaseConfigKeys()

  if (missingKeys.length === 0) {
    return null
  }

  return `Firebase configuration is missing: ${missingKeys.join(', ')}`
}

function createFirebaseApp(): FirebaseApp | null {
  const configError = getFirebaseConfigError()

  if (configError) {
    return null
  }

  return getApps()[0] ?? initializeApp(firebaseConfig)
}

export const app = createFirebaseApp()
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null
export const functions = app ? getFunctions(app) : null

export function requireFirebase() {
  if (!auth || !db || !storage || !functions) {
    throw new Error(getFirebaseConfigError() ?? 'Firebase is not initialized.')
  }

  return { app: app as FirebaseApp, auth, db, storage, functions }
}
