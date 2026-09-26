import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

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

let firebaseApp: FirebaseApp | null = null
let firestoreDb: Firestore | null = null

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

export function getFirebaseApp() {
  const configError = getFirebaseConfigError()

  if (configError) {
    throw new Error(configError)
  }

  firebaseApp ??= initializeApp(firebaseConfig)
  return firebaseApp
}

export function getFirestoreDb() {
  firestoreDb ??= getFirestore(getFirebaseApp())
  return firestoreDb
}
