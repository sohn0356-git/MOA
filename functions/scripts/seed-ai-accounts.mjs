import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const aiAccounts = [
  { uid: 'ai01', displayName: 'AI 01', email: 'ai01@moa-ai.app', password: 'MoaAi!2026-01' },
  { uid: 'ai02', displayName: 'AI 02', email: 'ai02@moa-ai.app', password: 'MoaAi!2026-02' },
  { uid: 'ai03', displayName: 'AI 03', email: 'ai03@moa-ai.app', password: 'MoaAi!2026-03' },
  { uid: 'ai04', displayName: 'AI 04', email: 'ai04@moa-ai.app', password: 'MoaAi!2026-04' },
  { uid: 'ai05', displayName: 'AI 05', email: 'ai05@moa-ai.app', password: 'MoaAi!2026-05' },
  { uid: 'ai06', displayName: 'AI 06', email: 'ai06@moa-ai.app', password: 'MoaAi!2026-06' },
  { uid: 'ai07', displayName: 'AI 07', email: 'ai07@moa-ai.app', password: 'MoaAi!2026-07' },
  { uid: 'ai08', displayName: 'AI 08', email: 'ai08@moa-ai.app', password: 'MoaAi!2026-08' },
  { uid: 'ai09', displayName: 'AI 09', email: 'ai09@moa-ai.app', password: 'MoaAi!2026-09' },
  { uid: 'ai10', displayName: 'AI 10', email: 'ai10@moa-ai.app', password: 'MoaAi!2026-10' },
]

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT

  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT secret.')
  }

  return JSON.parse(raw)
}

function initializeFirebaseAdmin() {
  if (getApps().length) return

  const serviceAccount = getServiceAccount()
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  })
}

async function seedAiAccounts() {
  initializeFirebaseAdmin()
  const auth = getAuth()

  for (const account of aiAccounts) {
    const userRecord = {
      disabled: false,
      displayName: account.displayName,
      email: account.email,
      emailVerified: true,
      password: account.password,
    }

    try {
      await auth.updateUser(account.uid, userRecord)
      console.log(`updated ${account.uid} ${account.email}`)
    } catch (error) {
      if (typeof error !== 'object' || !error || error.code !== 'auth/user-not-found') {
        throw error
      }

      await auth.createUser({
        uid: account.uid,
        ...userRecord,
      })
      console.log(`created ${account.uid} ${account.email}`)
    }

    await auth.setCustomUserClaims(account.uid, { aiAccount: true })
  }
}

seedAiAccounts().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
